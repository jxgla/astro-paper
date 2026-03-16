type Locale = "en" | "zh";

export {};

const LABELS = {
  en: {
    randomize: "Randomize",
    seed: "Seed",
    size: "Grid",
    symmetry: "Symmetry",
    palette: "Palette",
    downloadPng: "Download PNG",
    downloadSvg: "Download SVG",
    statusReady: "Upload an image or randomize. Everything runs locally.",
  },
  zh: {
    randomize: "随机生成",
    seed: "种子",
    size: "网格",
    symmetry: "对称",
    palette: "配色",
    downloadPng: "下载 PNG",
    downloadSvg: "下载 SVG",
    statusReady: "可上传图片或随机生成，全部本地处理。",
  },
} as const;

type PaletteKey = "neon" | "pastel" | "mono" | "sunset";

const PALETTES: Record<PaletteKey, string[]> = {
  neon: ["#0ea5e9", "#22c55e", "#f97316", "#a855f7", "#e11d48", "#facc15", "#0f172a", "#f8fafc"],
  pastel: ["#a7f3d0", "#bfdbfe", "#fde68a", "#fecaca", "#e9d5ff", "#0f172a", "#f8fafc"],
  mono: ["#0f172a", "#1f2937", "#334155", "#64748b", "#cbd5e1", "#f8fafc"],
  sunset: ["#fb7185", "#f97316", "#facc15", "#22c55e", "#38bdf8", "#a855f7", "#0f172a", "#f8fafc"],
};

function safeLocale(raw: unknown): Locale {
  return raw === "zh" ? "zh" : "en";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

async function fileToImageBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    return await createImageBitmap(file);
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image_load_failed"));
    });
    // @ts-ignore
    if (typeof createImageBitmap === "function") return await createImageBitmap(img);

    // Fallback: draw to canvas and treat it as bitmap source.
    const c = document.createElement("canvas");
    c.width = img.naturalWidth || img.width;
    c.height = img.naturalHeight || img.height;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("no_canvas_context");
    ctx.drawImage(img, 0, 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (c as any) as ImageBitmap;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function bitmapToPixelMatrix(bitmap: ImageBitmap, grid: number) {
  const canvas = document.createElement("canvas");
  canvas.width = grid;
  canvas.height = grid;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no_canvas_context");

  // Cover-fit crop to square then downscale to grid.
  const sw = bitmap.width;
  const sh = bitmap.height;
  const size = Math.min(sw, sh);
  const sx = Math.floor((sw - size) / 2);
  const sy = Math.floor((sh - size) / 2);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, grid, grid);
  ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, grid, grid);

  const imgd = ctx.getImageData(0, 0, grid, grid);
  const data = imgd.data;

  // Build a palette by quantizing colors (very lightweight):
  // store rgb buckets and pick most frequent.
  const freq = new Map<number, number>();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 32) continue;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    freq.set(key, (freq.get(key) || 0) + 1);
  }
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k);

  // Map each pixel to nearest palette entry.
  const palette = top.length
    ? top.map(k => ({
        r: ((k >> 8) & 0xf) * 17,
        g: ((k >> 4) & 0xf) * 17,
        b: (k & 0xf) * 17,
      }))
    : [{ r: 30, g: 41, b: 59 }, { r: 248, g: 250, b: 252 }];

  const idx: number[] = [];
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const p = (y * grid + x) * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const a = data[p + 3];
      if (a < 32) {
        idx.push(-1);
        continue;
      }
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < palette.length; i++) {
        const pr = palette[i].r;
        const pg = palette[i].g;
        const pb = palette[i].b;
        const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      idx.push(best);
    }
  }

  const paletteHex = palette.map(c => `#${c.r.toString(16).padStart(2, "0")}${c.g.toString(16).padStart(2, "0")}${c.b.toString(16).padStart(2, "0")}`);
  return { grid, idx, paletteHex };
}

function pixelMatrixToSvg(matrix: { grid: number; idx: number[]; paletteHex: string[] }, scale = 16) {
  const n = matrix.grid;
  const w = n * scale;
  const h = n * scale;
  const rects: string[] = [];
  rects.push(`<rect width="${w}" height="${h}" fill="#ffffff"/>`);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = matrix.idx[y * n + x];
      if (i < 0) continue;
      const fill = matrix.paletteHex[i] || "#000000";
      rects.push(`<rect x="${x * scale}" y="${y * scale}" width="${scale}" height="${scale}" fill="${fill}"/>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges">\n${rects.join("\n")}\n</svg>`;
}

function hashSeed(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function genMatrix(rnd: () => number, n: number, symmetry: boolean) {
  // Create a face-like symmetric pattern.
  const m: number[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
  const half = Math.ceil(n / 2);

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < half; x++) {
      const v = rnd() < 0.42 ? 1 : 0;
      m[y][x] = v;
      if (symmetry) m[y][n - 1 - x] = v;
    }
  }

  // carve eyes
  const eyeY = Math.floor(n * 0.35);
  const eyeX = Math.floor(n * 0.28);
  const eyeX2 = n - 1 - eyeX;
  if (m[eyeY]) {
    m[eyeY][eyeX] = 0;
    m[eyeY][eyeX2] = 0;
  }

  // mouth
  const mouthY = Math.floor(n * 0.72);
  if (m[mouthY]) {
    const mx = Math.floor(n * 0.35);
    m[mouthY][mx] = 0;
    m[mouthY][n - 1 - mx] = 0;
  }

  return m;
}

function initPixelAvatar() {
  const roots = Array.from(document.querySelectorAll("[data-pixel-avatar]"));
  for (const root of roots) {
    if (!(root instanceof HTMLElement)) continue;
    if (root.dataset.inited === "1") continue;
    root.dataset.inited = "1";

    const locale = safeLocale(root.dataset.locale);
    const L = LABELS[locale];

    const gridSelect = root.querySelector("[data-pixel-grid]");
    const fileInput = root.querySelector("[data-pixel-file]");
    const randomBtn = root.querySelector("[data-pixel-random]");
    const dlPngBtn = root.querySelector("[data-pixel-png]");
    const dlSvgBtn = root.querySelector("[data-pixel-svg]");
    const status = root.querySelector("[data-pixel-status]");
    const canvas = root.querySelector("[data-pixel-canvas]");

    if (!(gridSelect instanceof HTMLSelectElement)) continue;
    if (!(fileInput instanceof HTMLInputElement)) continue;
    if (!(randomBtn instanceof HTMLButtonElement)) continue;
    if (!(dlPngBtn instanceof HTMLButtonElement)) continue;
    if (!(dlSvgBtn instanceof HTMLButtonElement)) continue;
    if (!(status instanceof HTMLElement)) continue;
    if (!(canvas instanceof HTMLCanvasElement)) continue;

    status.textContent = L.statusReady;

    const renderPixels = (matrix: { grid: number; idx: number[]; paletteHex: string[] }) => {
      const grid = matrix.grid;
      const px = 8;
      canvas.width = grid * px;
      canvas.height = grid * px;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let y = 0; y < grid; y++) {
        for (let x = 0; x < grid; x++) {
          const i = matrix.idx[y * grid + x];
          if (i < 0) continue;
          ctx.fillStyle = matrix.paletteHex[i] || "#000";
          ctx.fillRect(x * px, y * px, px, px);
        }
      }

      (root as any)._pixelSvg = pixelMatrixToSvg(matrix, 16);
    };

    const randomize = () => {
      const grid = clamp(Number(gridSelect.value || 32), 8, 48);
      const palKey = ("neon" as PaletteKey);
      const pal = PALETTES[palKey] || PALETTES.neon;
      const seed = Math.random().toString(16).slice(2, 10);
      const rnd = mulberry32(hashSeed(`${seed}|${grid}`));
      const matrix = genMatrix(rnd, grid, true);
      const bg = "#ffffff";
      const fg = pal[Math.floor(rnd() * Math.min(5, pal.length))] || "#0ea5e9";

      // Convert 0/1 matrix to indexed palette of two colors.
      const idx: number[] = [];
      for (let y = 0; y < grid; y++) {
        for (let x = 0; x < grid; x++) {
          idx.push(matrix[y][x] ? 1 : -1);
        }
      }
      renderPixels({ grid, idx, paletteHex: [bg, fg] });
    };

    randomBtn.addEventListener("click", () => {
      randomize();
    });

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const grid = clamp(Number(gridSelect.value || 32), 8, 48);
        const bitmap = await fileToImageBitmap(file);
        const matrix = bitmapToPixelMatrix(bitmap, grid);
        renderPixels(matrix);
        status.textContent = locale === "zh" ? `已像素化：${file.name}` : `Pixelized: ${file.name}`;
      } catch (err: any) {
        status.textContent = locale === "zh" ? `处理失败：${String(err?.message || err)}` : `Failed: ${String(err?.message || err)}`;
      }
    });

    dlPngBtn.addEventListener("click", () => {
      downloadCanvasPng(canvas, "pixel-avatar.png");
    });

    dlSvgBtn.addEventListener("click", () => {
      const svg = (root as any)._pixelSvg || "";
      if (!svg) return;
      downloadText("pixel-avatar.svg", svg, "image/svg+xml;charset=utf-8");
    });

    // initial preview
    randomize();
  }
}

function boot() {
  initPixelAvatar();
}

document.addEventListener("astro:page-load", boot);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  queueMicrotask(boot);
}
