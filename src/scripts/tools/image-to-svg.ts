type Locale = "en" | "zh";

type MsgKey =
  | "pickImage"
  | "ready"
  | "converting"
  | "done"
  | "tooLarge"
  | "failed"
  | "copied"
  | "copyFailed"
  | "downloaded";

const MESSAGES: Record<Locale, Record<MsgKey, (arg?: any) => string>> = {
  en: {
    pickImage: () => "Pick an image first.",
    ready: () => "Tip: logos/illustrations work best. Photos may look messy.",
    converting: () => "Vectorizing...",
    done: (arg) => `Done. Source: ${arg?.w}×${arg?.h} → traced at ${arg?.tw}×${arg?.th}.`,
    tooLarge: (arg) => `Image too large. Please use <= ${arg?.max} px on the longest side.`,
    failed: (arg) => `Failed: ${arg || "unknown"}`,
    copied: () => "SVG copied.",
    copyFailed: () => "Copy failed. Please copy manually.",
    downloaded: () => "SVG downloaded.",
  },
  zh: {
    pickImage: () => "请先选择一张图片。",
    ready: () => "提示：Logo/插画效果最好；照片类可能会比较“碎”。",
    converting: () => "正在矢量化…",
    done: (arg) => `完成。原图：${arg?.w}×${arg?.h} → 处理尺寸：${arg?.tw}×${arg?.th}。`,
    tooLarge: (arg) => `图片太大，请控制最长边 <= ${arg?.max} px。`,
    failed: (arg) => `失败：${arg || "unknown"}`,
    copied: () => "已复制 SVG。",
    copyFailed: () => "复制失败，请手动复制。",
    downloaded: () => "已下载 SVG。",
  },
};

function clampInt(raw: unknown, min: number, max: number, fallback: number) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function safeLocale(raw: unknown): Locale {
  return raw === "zh" ? "zh" : "en";
}

function downloadTextFile(filename: string, text: string, mime: string) {
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

function parseSvgElement(svgText: string): SVGSVGElement | null {
  try {
    const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
    const el = doc.documentElement;
    if (!el || el.nodeName.toLowerCase() !== "svg") return null;
    return el as unknown as SVGSVGElement;
  } catch {
    return null;
  }
}

async function fileToImageBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    return await createImageBitmap(file);
  }

  // Fallback: HTMLImageElement
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image_load_failed"));
    });

    // createImageBitmap may exist even if TS doesn't narrow in some environments.
    if (typeof createImageBitmap === "function") return await createImageBitmap(img);

    // Last resort: draw to canvas without ImageBitmap
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no_canvas_context");
    ctx.drawImage(img, 0, 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (canvas as any) as ImageBitmap;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function bitmapToImageData(bitmap: ImageBitmap, maxSide: number) {
  const srcW = bitmap.width;
  const srcH = bitmap.height;
  const longest = Math.max(srcW, srcH);

  const scale = longest > maxSide ? maxSide / longest : 1;
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no_canvas_context");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);

  const imgd = ctx.getImageData(0, 0, w, h);
  return { srcW, srcH, w, h, imgd };
}

async function loadImageTracer(): Promise<any> {
  // Lazy import so the tools page initial load stays fast.
  const mod = await import("imagetracerjs");
  return (mod as any)?.default ?? mod;
}

function initImageToSvgTool() {
  const forms = Array.from(document.querySelectorAll("[data-image-to-svg]"));
  for (const root of forms) {
    if (!(root instanceof HTMLElement)) continue;
    if (root.dataset.inited === "1") continue;
    root.dataset.inited = "1";

    const locale = safeLocale(root.dataset.locale);
    const t = MESSAGES[locale];

    const fileInput = root.querySelector("[data-image-to-svg-file]");
    const fileLabel = root.querySelector("[data-image-to-svg-file-label]");
    const presetSelect = root.querySelector("[data-image-to-svg-preset]");
    const maxSideInput = root.querySelector("[data-image-to-svg-max]");
    const convertBtn = root.querySelector("[data-image-to-svg-convert]");
    const copyBtn = root.querySelector("[data-image-to-svg-copy]");
    const downloadBtn = root.querySelector("[data-image-to-svg-download]");
    const statusEl = root.querySelector("[data-image-to-svg-status]");
    const previewEl = root.querySelector("[data-image-to-svg-preview]");
    const codeEl = root.querySelector("[data-image-to-svg-code]");

    if (!(fileInput instanceof HTMLInputElement)) continue;
    if (fileLabel && !(fileLabel instanceof HTMLElement)) continue;
    if (!(presetSelect instanceof HTMLSelectElement)) continue;
    if (!(maxSideInput instanceof HTMLInputElement)) continue;
    if (!(convertBtn instanceof HTMLButtonElement)) continue;
    if (!(copyBtn instanceof HTMLButtonElement)) continue;
    if (!(downloadBtn instanceof HTMLButtonElement)) continue;
    if (!(statusEl instanceof HTMLElement)) continue;
    if (!(previewEl instanceof HTMLElement)) continue;
    if (!(codeEl instanceof HTMLElement)) continue;

    let busy = false;
    let latestSvg = "";

    const setBusy = (next: boolean) => {
      busy = next;
      convertBtn.disabled = next;
      fileInput.disabled = next;
      presetSelect.disabled = next;
      maxSideInput.disabled = next;
      copyBtn.disabled = next || !latestSvg;
      downloadBtn.disabled = next || !latestSvg;
    };

    const renderSvgPreview = (svgText: string) => {
      previewEl.innerHTML = "";
      const svgEl = parseSvgElement(svgText);
      if (!svgEl) return;
      // Ensure it is responsive.
      if (!svgEl.getAttribute("viewBox")) {
        const w = svgEl.getAttribute("width");
        const h = svgEl.getAttribute("height");
        if (w && h) svgEl.setAttribute("viewBox", `0 0 ${w} ${h}`);
      }
      svgEl.removeAttribute("width");
      svgEl.removeAttribute("height");
      previewEl.appendChild(svgEl);
    };

    const syncOutput = () => {
      codeEl.textContent = latestSvg;
      renderSvgPreview(latestSvg);
      copyBtn.disabled = !latestSvg || busy;
      downloadBtn.disabled = !latestSvg || busy;
    };

    statusEl.textContent = t.ready();
    setBusy(false);

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (fileLabel instanceof HTMLElement) {
        const base = locale === "zh" ? "已选择" : "Selected";
        const sizeKb = file ? Math.round(file.size / 1024) : 0;
        fileLabel.textContent = file ? `${base}: ${file.name} (${sizeKb} KB)` : (locale === "zh" ? "选择图片" : "Choose image");
      }
      latestSvg = "";
      previewEl.innerHTML = "";
      codeEl.textContent = "";
      statusEl.textContent = t.ready();
      setBusy(false);
    });

    convertBtn.addEventListener("click", async () => {
      if (busy) return;
      const file = fileInput.files?.[0];
      if (!file) {
        statusEl.textContent = t.pickImage();
        return;
      }

      const maxSide = clampInt(maxSideInput.value, 256, 4096, 2048);
      maxSideInput.value = String(maxSide);

      try {
        setBusy(true);
        statusEl.textContent = t.converting();

        const bitmap = await fileToImageBitmap(file);
        const { srcW, srcH, w, h, imgd } = await bitmapToImageData(bitmap, maxSide);

        // Reject extremely large images even after downscale attempt.
        if (Math.max(w, h) > 4096) {
          statusEl.textContent = t.tooLarge({ max: 4096 });
          return;
        }

        const preset = String(presetSelect.value || "default");

        const ImageTracer = await loadImageTracer();
        const api = (ImageTracer as any)?.ImageTracer ?? ImageTracer;
        if (!api || typeof api.imagedataToSVG !== "function") {
          throw new Error("imagetracerjs_api_not_found");
        }

        // Use preset strings supported by imagetracerjs (default/posterized*/detailed/...)
        latestSvg = String(api.imagedataToSVG(imgd, preset));
        syncOutput();
        statusEl.textContent = t.done({ w: srcW, h: srcH, tw: w, th: h });
      } catch (err: any) {
        const msg = String(err?.message || err || "unknown");
        statusEl.textContent = t.failed(msg);
      } finally {
        setBusy(false);
      }
    });

    copyBtn.addEventListener("click", async () => {
      if (!latestSvg) return;
      try {
        await navigator.clipboard.writeText(latestSvg);
        statusEl.textContent = t.copied();
      } catch {
        statusEl.textContent = t.copyFailed();
      }
    });

    downloadBtn.addEventListener("click", () => {
      if (!latestSvg) return;
      downloadTextFile("trace.svg", latestSvg, "image/svg+xml;charset=utf-8");
      statusEl.textContent = t.downloaded();
    });
  }
}

function boot() {
  initImageToSvgTool();
}

document.addEventListener("astro:page-load", boot);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  queueMicrotask(boot);
}
