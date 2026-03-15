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
    statusReady: "Generate a tiny avatar locally.",
  },
  zh: {
    randomize: "随机生成",
    seed: "种子",
    size: "网格",
    symmetry: "对称",
    palette: "配色",
    downloadPng: "下载 PNG",
    downloadSvg: "下载 SVG",
    statusReady: "纯本地生成像素头像。",
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

function matrixToSvg(matrix: number[][], colors: { bg: string; fg: string }, scale = 16) {
  const n = matrix.length;
  const w = n * scale;
  const h = n * scale;
  const rects: string[] = [];
  rects.push(`<rect width="${w}" height="${h}" fill="${colors.bg}"/>`);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!matrix[y][x]) continue;
      rects.push(`<rect x="${x * scale}" y="${y * scale}" width="${scale}" height="${scale}" fill="${colors.fg}"/>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges">\n${rects.join("\n")}\n</svg>`;
}

function initPixelAvatar() {
  const roots = Array.from(document.querySelectorAll("[data-pixel-avatar]"));
  for (const root of roots) {
    if (!(root instanceof HTMLElement)) continue;
    if (root.dataset.inited === "1") continue;
    root.dataset.inited = "1";

    const locale = safeLocale(root.dataset.locale);
    const L = LABELS[locale];

    const seedInput = root.querySelector("[data-pixel-seed]");
    const gridSelect = root.querySelector("[data-pixel-grid]");
    const symToggle = root.querySelector("[data-pixel-sym]");
    const palSelect = root.querySelector("[data-pixel-pal]");
    const randomBtn = root.querySelector("[data-pixel-random]");
    const dlPngBtn = root.querySelector("[data-pixel-png]");
    const dlSvgBtn = root.querySelector("[data-pixel-svg]");
    const status = root.querySelector("[data-pixel-status]");
    const canvas = root.querySelector("[data-pixel-canvas]");

    if (!(seedInput instanceof HTMLInputElement)) continue;
    if (!(gridSelect instanceof HTMLSelectElement)) continue;
    if (!(symToggle instanceof HTMLInputElement)) continue;
    if (!(palSelect instanceof HTMLSelectElement)) continue;
    if (!(randomBtn instanceof HTMLButtonElement)) continue;
    if (!(dlPngBtn instanceof HTMLButtonElement)) continue;
    if (!(dlSvgBtn instanceof HTMLButtonElement)) continue;
    if (!(status instanceof HTMLElement)) continue;
    if (!(canvas instanceof HTMLCanvasElement)) continue;

    status.textContent = L.statusReady;

    const draw = () => {
      const seed = String(seedInput.value || "seed");
      const grid = clamp(Number(gridSelect.value || 16), 8, 32);
      const symmetry = Boolean(symToggle.checked);
      const palKey = (String(palSelect.value || "neon") as PaletteKey) || "neon";
      const pal = PALETTES[palKey] || PALETTES.neon;

      const rnd = mulberry32(hashSeed(`${seed}|${grid}|${symmetry}|${palKey}`));
      const matrix = genMatrix(rnd, grid, symmetry);

      const bg = pal[pal.length - 1] || "#f8fafc";
      const fg = pal[Math.floor(rnd() * Math.min(5, pal.length))] || "#0ea5e9";

      // render canvas
      const px = 12;
      canvas.width = grid * px;
      canvas.height = grid * px;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = fg;
      for (let y = 0; y < grid; y++) {
        for (let x = 0; x < grid; x++) {
          if (!matrix[y][x]) continue;
          ctx.fillRect(x * px, y * px, px, px);
        }
      }

      // attach svg string to dataset for download
      (root as any)._pixelSvg = matrixToSvg(matrix, { bg, fg }, 16);
    };

    randomBtn.addEventListener("click", () => {
      seedInput.value = Math.random().toString(16).slice(2, 10);
      draw();
    });

    dlPngBtn.addEventListener("click", () => {
      downloadCanvasPng(canvas, "pixel-avatar.png");
    });

    dlSvgBtn.addEventListener("click", () => {
      const svg = (root as any)._pixelSvg || "";
      if (!svg) return;
      downloadText("pixel-avatar.svg", svg, "image/svg+xml;charset=utf-8");
    });

    // init palette options
    if (palSelect.querySelectorAll("option").length <= 1) {
      (Object.keys(PALETTES) as PaletteKey[]).forEach(k => {
        const opt = document.createElement("option");
        opt.value = k;
        opt.textContent = k;
        palSelect.appendChild(opt);
      });
    }

    draw();
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
