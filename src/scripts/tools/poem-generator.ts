type Locale = "en" | "zh";
type PoemMode = "head" | "tail";

export {};

const POEM_API_URL = import.meta.env.DEV
  ? "http://localhost:8787/v1/chat"
  : "https://mirror.410666.xyz/v1/chat";

const LABELS = {
  en: {
    statusReady: "Chinese only. Use 2-8 characters. Odd counts will be padded at the edge.",
    statusGenerating: "Generating with grok-4.1-thinking...",
    statusDone: "Poem generated.",
    statusCopied: "Copied.",
    statusCopyFail: "Copy failed.",
    statusNeedKeyword: "Enter 2-8 Chinese characters.",
    statusChineseOnly: "Chinese characters only.",
    statusThemeChineseOnly: "Theme must also be Chinese only.",
    statusRetry: "Model drifted from the requested format. Please retry.",
    statusError: "Generation failed. Please retry.",
    toastChineseOnly: "Chinese only",
    toastRange: "Use 2-8 chars",
    toastCopied: "Copied",
    metaHead: "Acrostic",
    metaTail: "Telestich",
    metaLines: "lines",
    metaPadded: "Auto-padded",
    padStart: "prepended",
    padEnd: "appended",
  },
  zh: {
    statusReady: "仅支持纯中文输入，建议 2-8 个字；奇数字数会自动在首尾补成双数句。",
    statusGenerating: "正在调用 grok-4.1-thinking 生成...",
    statusDone: "已生成。",
    statusCopied: "已复制。",
    statusCopyFail: "复制失败。",
    statusNeedKeyword: "请输入 2-8 个中文字符。",
    statusChineseOnly: "只支持纯中文输入。",
    statusThemeChineseOnly: "意境也必须是纯中文。",
    statusRetry: "模型这次没严格对齐格式，请重试。",
    statusError: "生成失败，请稍后重试。",
    toastChineseOnly: "只支持中文",
    toastRange: "请输入 2-8 个字",
    toastCopied: "已复制",
    metaHead: "藏头",
    metaTail: "藏尾",
    metaLines: "句",
    metaPadded: "自动补字",
    padStart: "前补",
    padEnd: "后补",
  },
} as const;

function safeLocale(raw: unknown): Locale {
  return raw === "zh" ? "zh" : "en";
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isPureChinese(text: string) {
  return /^[\u4e00-\u9fff]+$/.test(text);
}

function toChineseOnly(text: string) {
  return (text.match(/[\u4e00-\u9fff]/g) || []).join("");
}

function getToast() {
  let el = document.getElementById("tools-toast");
  if (el instanceof HTMLElement) return el;
  el = document.createElement("div");
  el.id = "tools-toast";
  el.className = "tools-toast";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  document.body.appendChild(el);
  return el;
}

let toastTimer: number | null = null;

function showToast(message: string) {
  const toast = getToast();
  toast.textContent = message;
  toast.classList.add("is-open");
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-open");
  }, 1100);
}

function normalizeInput(raw: string) {
  return String(raw || "").trim();
}

function pickPadChar(theme: string, mode: PoemMode) {
  if (theme && isPureChinese(theme)) {
    return mode === "head" ? theme[0] : theme[theme.length - 1];
  }
  return mode === "head" ? "吟" : "题";
}

function normalizeSequence(keyword: string, theme: string, mode: PoemMode) {
  if (keyword.length % 2 === 0) {
    return {
      sequence: keyword,
      padded: false,
      padChar: "",
      padAt: "none" as const,
    };
  }

  const padChar = pickPadChar(theme, mode);
  if (mode === "head") {
    return {
      sequence: `${keyword}${padChar}`,
      padded: true,
      padChar,
      padAt: "end" as const,
    };
  }

  return {
    sequence: `${padChar}${keyword}`,
    padded: true,
    padChar,
    padAt: "start" as const,
  };
}

function buildPrompt(params: {
  mode: PoemMode;
  sequence: string;
  theme: string;
  lineLength: 5 | 7;
  strictRetry?: boolean;
}) {
  const { mode, sequence, theme, lineLength, strictRetry } = params;
  const modeName = mode === "head" ? "藏头诗" : "藏尾诗";
  const chars = sequence.split("").join("、");
  const vibe = theme || "不限定，但要自然、顺口、有古风诗意";
  const strictLine = strictRetry
    ? "你上一次没有严格遵守格式。这一次如果任何一句的位置、句数或字数不对，就立刻在输出前自行重写，直到完全合格。"
    : "务必一次性严格命中格式。";

  return [
    "你现在只做一件事：写一首中文短诗。",
    `类型：${modeName}`,
    `目标序列：${sequence}`,
    `目标字符顺序：${chars}`,
    `主题意境：${vibe}`,
    "规则：",
    `1. 必须输出 ${sequence.length} 行。`,
    `2. 每行必须恰好 ${lineLength} 个汉字，不计句末标点。`,
    "3. 如果是藏头诗，则每行第一个字依次严格等于目标序列对应字符；如果是藏尾诗，则每行最后一个字依次严格等于目标序列对应字符。",
    "4. 只能输出诗句本身，不要标题、解释、注释、引号、编号、空行、括号补充。",
    "5. 全部使用中文，风格自然，不要生硬地解释藏字。",
    strictLine,
  ].join("\n");
}

function extractAssistantText(payload: any) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        return "";
      })
      .join("")
      .trim();
  }
  return "";
}

function stripCodeFence(text: string) {
  return text.replace(/^```[\w-]*\s*/i, "").replace(/\s*```$/, "").trim();
}

function normalizePoemLines(text: string) {
  const cleaned = stripCodeFence(text).replace(/\r/g, "").trim();
  return cleaned
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
}

function validatePoem(lines: string[], sequence: string, mode: PoemMode, lineLength: number) {
  if (lines.length !== sequence.length) return false;

  for (let i = 0; i < lines.length; i += 1) {
    const chineseOnly = toChineseOnly(lines[i]);
    if (chineseOnly.length !== lineLength) return false;
    if (mode === "head") {
      if (chineseOnly[0] !== sequence[i]) return false;
    } else if (chineseOnly[chineseOnly.length - 1] !== sequence[i]) {
      return false;
    }
  }

  return true;
}

async function fetchPoem(params: {
  mode: PoemMode;
  sequence: string;
  theme: string;
  lineLength: 5 | 7;
  strictRetry?: boolean;
}) {
  const response = await fetch(POEM_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-4.1-thinking",
      stream: false,
      messages: [
        {
          role: "user",
          content: buildPrompt(params),
        },
      ],
    }),
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    if (typeof payload === "string") throw new Error(payload || `HTTP ${response.status}`);
    throw new Error(payload?.error || `HTTP ${response.status}`);
  }

  if (typeof payload === "string") return payload.trim();
  return extractAssistantText(payload);
}

async function generateStrictPoem(params: {
  mode: PoemMode;
  sequence: string;
  theme: string;
  lineLength: 5 | 7;
}) {
  const first = await fetchPoem(params);
  let lines = normalizePoemLines(first);
  if (validatePoem(lines, params.sequence, params.mode, params.lineLength)) {
    return lines.join("\n");
  }

  const second = await fetchPoem({ ...params, strictRetry: true });
  lines = normalizePoemLines(second);
  if (validatePoem(lines, params.sequence, params.mode, params.lineLength)) {
    return lines.join("\n");
  }

  throw new Error("format_mismatch");
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

function renderMeta(root: HTMLElement, locale: Locale, data: {
  mode: PoemMode;
  sequence: string;
  padded: boolean;
  padChar: string;
  padAt: "start" | "end" | "none";
}) {
  const meta = root.querySelector("[data-poem-meta]");
  if (!(meta instanceof HTMLElement)) return;
  const L = LABELS[locale];
  const modeLabel = data.mode === "head" ? L.metaHead : L.metaTail;
  const items = [
    `<span class="poem-chip">${escapeHtml(modeLabel)}</span>`,
    `<span class="poem-chip">${escapeHtml(data.sequence)}</span>`,
    `<span class="poem-chip">${data.sequence.length} ${escapeHtml(L.metaLines)}</span>`,
  ];

  if (data.padded && data.padChar) {
    const padLabel = data.padAt === "start" ? L.padStart : L.padEnd;
    items.push(
      `<span class="poem-chip">${escapeHtml(L.metaPadded)}：${escapeHtml(data.padChar)} · ${escapeHtml(padLabel)}</span>`
    );
  }

  meta.innerHTML = items.join("");
}

function initPoemTool() {
  const roots = Array.from(document.querySelectorAll("[data-poem-gen]"));
  for (const root of roots) {
    if (!(root instanceof HTMLElement)) continue;
    if (root.dataset.inited === "1") continue;
    root.dataset.inited = "1";

    const locale = safeLocale(root.dataset.locale);
    const L = LABELS[locale];

    const keywordInput = root.querySelector("[data-poem-keyword]");
    const themeInput = root.querySelector("[data-poem-theme]");
    const modeSelect = root.querySelector("[data-poem-mode]");
    const lineLengthSelect = root.querySelector("[data-poem-line-length]");
    const generateBtn = root.querySelector("[data-poem-generate]");
    const copyBtn = root.querySelector("[data-poem-copy]");
    const status = root.querySelector("[data-poem-status]");
    const output = root.querySelector("[data-poem-output]");

    if (!(keywordInput instanceof HTMLInputElement)) continue;
    if (!(themeInput instanceof HTMLInputElement)) continue;
    if (!(modeSelect instanceof HTMLSelectElement)) continue;
    if (!(lineLengthSelect instanceof HTMLSelectElement)) continue;
    if (!(generateBtn instanceof HTMLButtonElement)) continue;
    if (!(copyBtn instanceof HTMLButtonElement)) continue;
    if (!(status instanceof HTMLElement)) continue;
    if (!(output instanceof HTMLElement)) continue;

    let lastOutput = "";

    status.textContent = L.statusReady;

    const setBusy = (busy: boolean) => {
      generateBtn.disabled = busy;
      copyBtn.disabled = busy || !lastOutput;
    };

    generateBtn.addEventListener("click", async () => {
      const keyword = normalizeInput(keywordInput.value);
      const theme = normalizeInput(themeInput.value);
      const mode = (modeSelect.value === "tail" ? "tail" : "head") as PoemMode;
      const lineLength = (lineLengthSelect.value === "5" ? 5 : 7) as 5 | 7;

      if (!keyword || keyword.length < 2 || keyword.length > 8) {
        status.textContent = L.statusNeedKeyword;
        showToast(L.toastRange);
        keywordInput.focus();
        return;
      }
      if (!isPureChinese(keyword)) {
        status.textContent = L.statusChineseOnly;
        showToast(L.toastChineseOnly);
        keywordInput.focus();
        return;
      }
      if (theme && !isPureChinese(theme)) {
        status.textContent = L.statusThemeChineseOnly;
        showToast(L.toastChineseOnly);
        themeInput.focus();
        return;
      }

      const normalized = normalizeSequence(keyword, theme, mode);
      renderMeta(root, locale, {
        mode,
        sequence: normalized.sequence,
        padded: normalized.padded,
        padChar: normalized.padChar,
        padAt: normalized.padAt,
      });

      status.textContent = L.statusGenerating;
      output.textContent = "";
      lastOutput = "";
      setBusy(true);

      try {
        const poem = await generateStrictPoem({
          mode,
          sequence: normalized.sequence,
          theme,
          lineLength,
        });
        lastOutput = poem;
        output.textContent = poem;
        status.textContent = L.statusDone;
      } catch (error) {
        lastOutput = "";
        output.textContent = "";
        status.textContent = error instanceof Error && error.message === "format_mismatch" ? L.statusRetry : L.statusError;
      } finally {
        setBusy(false);
      }
    });

    copyBtn.addEventListener("click", async () => {
      if (!lastOutput) return;
      try {
        await copyText(lastOutput);
        status.textContent = L.statusCopied;
        showToast(L.toastCopied);
      } catch {
        status.textContent = L.statusCopyFail;
      }
    });
  }
}

function boot() {
  initPoemTool();
}

document.addEventListener("astro:page-load", boot);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  queueMicrotask(boot);
}