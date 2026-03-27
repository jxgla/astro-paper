type Locale = "en" | "zh";
type StyleKey = "cyber" | "xianxia" | "minimal" | "japan" | "abstract" | "emo" | "biz";
type PlatformKey = "generic" | "github" | "discord" | "x" | "xiaohongshu" | "bilibili";
type LanguageMode = "mixed" | "en" | "zh";

export {};

const LABELS = {
  en: {
    statusReady: "Generate names locally. No network.",
    statusGenerated: (count: number) => `Generated ${count} names.`,
    copied: "Copied.",
    copyFail: "Copy failed.",
    copiedAll: "Copied all.",
  },
  zh: {
    statusReady: "纯本地生成，不联网。",
    statusGenerated: (count: number) => `已生成 ${count} 个名字。`,
    copied: "已复制。",
    copyFail: "复制失败。",
    copiedAll: "已复制全部。",
  },
} as const;

const STYLE_LABEL: Record<Locale, Record<StyleKey, string>> = {
  en: {
    cyber: "Cyber",
    xianxia: "Xianxia",
    minimal: "Minimal",
    japan: "J-Style",
    abstract: "Abstract",
    emo: "Emo",
    biz: "Business",
  },
  zh: {
    cyber: "赛博",
    xianxia: "仙侠",
    minimal: "极简",
    japan: "日系",
    abstract: "抽象",
    emo: "emo",
    biz: "商务",
  },
};

const PLATFORM_AFFIXES: Record<PlatformKey, { prefix: string[]; suffix: string[] }> = {
  generic: { prefix: ["", "", "the", "real"], suffix: ["", "", "", "01"] },
  github: { prefix: ["dev", "git", "repo", "merge", "commit"], suffix: ["dev", "lab", "code", "hub", "dotts"] },
  discord: { prefix: ["void", "night", "soft", "ghost", "pixel"], suffix: ["core", "vibe", "wave", "zone", "room"] },
  x: { prefix: ["thread", "hot", "late", "micro", "viral"], suffix: ["post", "takes", "era", "mode", "drop"] },
  xiaohongshu: { prefix: ["奶", "盐", "糯", "雾", "莓"], suffix: ["日记", "手账", "星球", "研究所", "养成中"] },
  bilibili: { prefix: ["阿", "小", "次元", "弹幕", "摸鱼"], suffix: ["同学", "酱", "频道", "研究员", "pro"] },
};

const LIB = {
  cyber: {
    pre: ["Neo", "Meta", "Hyper", "Null", "Ghost", "Byte", "Kernel", "Cipher", "Vibe", "Zero"],
    mid: ["_", "-", "·", ""],
    suf: ["Runner", "Wave", "Signal", "Protocol", "Drift", "Mesh", "Mode", "Cache", "Spec", "Lab"],
  },
  xianxia: {
    pre: ["清", "霁", "寒", "拂", "落", "烟", "归", "听", "照", "云"],
    mid: ["风", "月", "雪", "雨", "星", "霜", "尘", "梦", "松", "河"],
    suf: ["客", "君", "游", "子", "眠", "辞", "舟", "书", "歌", "盏"],
  },
  minimal: {
    pre: ["plain", "mono", "calm", "mood", "note", "soft", "simple", "bare"],
    mid: ["_", "-", ""],
    suf: ["01", "02", "07", "", "", "x", "z"],
  },
  japan: {
    pre: ["sora", "yuki", "mori", "nagi", "haru", "kumo", "hikari"],
    mid: ["_", "-", ""],
    suf: ["chan", "kun", "san", "", "dayo", "desu"],
  },
  abstract: {
    pre: ["抽象", "离谱", "离大谱", "我裂开", "我绷不住", "我谢谢你", "大可不必"],
    mid: ["·", " ", "_"],
    suf: ["研究员", "观察者", "管理员", "小助手", "体验官", "代言人"],
  },
  emo: {
    pre: ["失眠", "空白", "潮湿", "回声", "偏航", "落日", "无声"],
    mid: ["·", "_", ""],
    suf: ["档案", "碎片", "日记", "备忘录", "低电量", "未读"],
  },
  biz: {
    pre: ["PM", "Ops", "Owner", "Lead", "Staff", "Principal"],
    mid: ["-", "_", ""],
    suf: ["Desk", "Notes", "Tracker", "Board", "Review", "Sync"],
  },
} as const;

function safeLocale(raw: unknown): Locale {
  return raw === "zh" ? "zh" : "en";
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

function hashSeed(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(rnd: () => number, arr: readonly T[]) {
  return arr[Math.floor(rnd() * arr.length)];
}

function normalizeKeyword(raw: string) {
  const s = String(raw || "").trim();
  if (!s) return "";
  return s.slice(0, 16);
}

function normalizePlatform(raw: string): PlatformKey {
  if (raw === "github" || raw === "discord" || raw === "x" || raw === "xiaohongshu" || raw === "bilibili") return raw;
  return "generic";
}

function normalizeLanguage(raw: string): LanguageMode {
  if (raw === "en" || raw === "zh") return raw;
  return "mixed";
}

function normalizeMax(raw: string) {
  const num = Number(raw || 18);
  if (Number.isNaN(num)) return 18;
  return Math.max(6, Math.min(28, Math.round(num)));
}

function isMostlyChinese(value: string) {
  return /[\u3400-\u9fff]/.test(value) && !/[A-Za-z]/.test(value);
}

function isMostlyEnglish(value: string) {
  return /[A-Za-z]/.test(value) && !/[\u3400-\u9fff]/.test(value);
}

function applyLanguageMode(base: string, keyword: string, mode: LanguageMode, style: StyleKey, rnd: () => number) {
  const cleanKeyword = keyword.trim();
  if (mode === "zh") {
    if (isMostlyChinese(base)) return base;
    const zhLib = LIB[style === "xianxia" || style === "abstract" || style === "emo" ? style : "xianxia"];
    const extra = `${pick(rnd, zhLib.pre)}${pick(rnd, zhLib.mid)}${pick(rnd, zhLib.suf)}`;
    return cleanKeyword && /[\u3400-\u9fff]/.test(cleanKeyword) ? `${cleanKeyword}${pick(rnd, ["", "·", ""])}${extra}` : extra;
  }
  if (mode === "en") {
    if (isMostlyEnglish(base)) return base;
    const enLib = LIB[style === "cyber" || style === "minimal" || style === "japan" || style === "biz" ? style : "cyber"];
    const extra = `${pick(rnd, enLib.pre)}${pick(rnd, enLib.mid)}${pick(rnd, enLib.suf)}`;
    return cleanKeyword && /[A-Za-z]/.test(cleanKeyword) ? `${cleanKeyword}${pick(rnd, ["", "-", "_"])}${extra}` : extra;
  }
  if (cleanKeyword && rnd() < 0.35) {
    return `${base}${pick(rnd, ["", "·", "-", "_"])}${cleanKeyword}`;
  }
  return base;
}

function maybeApplyPlatform(base: string, platform: PlatformKey, mode: LanguageMode, rnd: () => number, noSymbols: boolean) {
  const affix = PLATFORM_AFFIXES[platform];
  if (!affix) return base;
  const glue = noSymbols ? "" : pick(rnd, ["", "", "_", "-"]);
  const prefix = pick(rnd, affix.prefix);
  const suffix = pick(rnd, affix.suffix);

  if (mode === "zh" && /[\u3400-\u9fff]/.test(base)) {
    return `${prefix}${base}${suffix}`;
  }
  if (mode === "en" && /[A-Za-z]/.test(base)) {
    return `${prefix ? `${prefix}${glue}` : ""}${base}${suffix ? `${glue}${suffix}` : ""}`;
  }
  return `${prefix ? `${prefix}${glue}` : ""}${base}${suffix ? `${glue}${suffix}` : ""}`;
}

function sanitizeName(value: string, maxLength: number, noSymbols: boolean) {
  let cleaned = String(value || "").replace(/\s{2,}/g, " ").trim();
  if (noSymbols) cleaned = cleaned.replace(/[·_.-]/g, "");
  cleaned = cleaned.replace(/^[_\-.·\s]+|[_\-.·\s]+$/g, "");
  if (!cleaned) return "";
  if (cleaned.length > maxLength) return "";
  return cleaned;
}

function makeOne(rnd: () => number, style: StyleKey, keyword: string) {
  const lib = LIB[style];
  const a = pick(rnd, lib.pre);
  const b = pick(rnd, lib.mid);
  const c = pick(rnd, lib.suf);
  if (keyword && rnd() < 0.55) {
    const pos = rnd();
    if (pos < 0.33) return `${keyword}${b}${a}${c}`;
    if (pos < 0.66) return `${a}${b}${keyword}${c}`;
    return `${a}${b}${c}${b}${keyword}`;
  }
  return `${a}${b}${c}`;
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

function initNicknameTool() {
  const roots = Array.from(document.querySelectorAll("[data-nickname-gen]"));
  for (const root of roots) {
    if (!(root instanceof HTMLElement)) continue;
    if (root.dataset.inited === "1") continue;
    root.dataset.inited = "1";

    const locale = safeLocale(root.dataset.locale);
    const L = LABELS[locale];

    const keywordInput = root.querySelector("[data-nickname-key]");
    const styleSelect = root.querySelector("[data-nickname-style]");
    const platformSelect = root.querySelector("[data-nickname-platform]");
    const languageSelect = root.querySelector("[data-nickname-language]");
    const maxInput = root.querySelector("[data-nickname-max]");
    const noSymbolsInput = root.querySelector("[data-nickname-no-symbols]");
    const genBtn = root.querySelector("[data-nickname-generate]");
    const moreBtn = root.querySelector("[data-nickname-more]");
    const copyAllBtn = root.querySelector("[data-nickname-copyall]");
    const status = root.querySelector("[data-nickname-status]");
    const list = root.querySelector("[data-nickname-list]");

    if (!(keywordInput instanceof HTMLInputElement)) continue;
    if (!(styleSelect instanceof HTMLSelectElement)) continue;
    if (!(platformSelect instanceof HTMLSelectElement)) continue;
    if (!(languageSelect instanceof HTMLSelectElement)) continue;
    if (!(maxInput instanceof HTMLInputElement)) continue;
    if (!(noSymbolsInput instanceof HTMLInputElement)) continue;
    if (!(genBtn instanceof HTMLButtonElement)) continue;
    if (!(moreBtn instanceof HTMLButtonElement)) continue;
    if (!(copyAllBtn instanceof HTMLButtonElement)) continue;
    if (!(status instanceof HTMLElement)) continue;
    if (!(list instanceof HTMLElement)) continue;

    status.textContent = L.statusReady;

    let seedBase = Date.now();
    let lastNames: string[] = [];

    const getToast = () => {
      let el = document.getElementById("tools-toast");
      if (el instanceof HTMLElement) return el;
      el = document.createElement("div");
      el.id = "tools-toast";
      el.className = "tools-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
      return el;
    };

    let toastTimer: number | null = null;
    const showToast = (message: string) => {
      const el = getToast();
      el.textContent = message;
      el.classList.add("is-open");
      if (toastTimer) window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        el.classList.remove("is-open");
      }, 1100);
    };

    const renderList = (names: string[]) => {
      list.innerHTML = names
        .map(
          (name, index) => `
            <button class="nickname-tile" type="button" data-nickname-tile data-i="${index}" title="${name}">
              <span>${name}</span>
            </button>
          `
        )
        .join("");

      list.querySelectorAll("[data-nickname-tile]").forEach(button => {
        button.addEventListener("click", async () => {
          const i = Number((button as HTMLElement).dataset.i || 0);
          const text = names[i] || "";
          if (!text) return;
          try {
            await copyText(text);
            status.textContent = L.copied;
            showToast(locale === "zh" ? "已复制" : "Copied");
            (button as HTMLElement).classList.add("is-copied");
            window.setTimeout(() => (button as HTMLElement).classList.remove("is-copied"), 650);
          } catch {
            status.textContent = L.copyFail;
            showToast(locale === "zh" ? "复制失败" : "Copy failed");
          }
        });
      });

      copyAllBtn.disabled = names.length === 0;
    };

    const generate = (bumpSeed: boolean) => {
      const style = (styleSelect.value as StyleKey) || "cyber";
      const platform = normalizePlatform(platformSelect.value);
      const language = normalizeLanguage(languageSelect.value);
      const keyword = normalizeKeyword(keywordInput.value);
      const maxLength = normalizeMax(maxInput.value);
      const noSymbols = noSymbolsInput.checked;
      if (bumpSeed) seedBase += 1;
      const seed = hashSeed(`${style}|${platform}|${language}|${keyword}|${maxLength}|${noSymbols ? 1 : 0}|${seedBase}`);
      const rnd = mulberry32(seed);

      const out: string[] = [];
      const seen = new Set<string>();
      const target = 20;
      let tries = 0;
      while (out.length < target && tries < 800) {
        tries += 1;
        let name = makeOne(rnd, style, keyword);
        name = applyLanguageMode(name, keyword, language, style, rnd);
        name = maybeApplyPlatform(name, platform, language, rnd, noSymbols);
        const cleaned = sanitizeName(name, maxLength, noSymbols);
        if (!cleaned) continue;
        if (seen.has(cleaned)) continue;
        seen.add(cleaned);
        out.push(cleaned);
      }
      lastNames = out;
      renderList(out);
      status.textContent = L.statusGenerated(out.length);
    };

    genBtn.addEventListener("click", () => generate(false));
    moreBtn.addEventListener("click", () => generate(true));

    copyAllBtn.addEventListener("click", async () => {
      if (!lastNames.length) return;
      try {
        await copyText(lastNames.join("\n"));
        status.textContent = L.copiedAll;
      } catch {
        status.textContent = L.copyFail;
      }
    });

    Array.from(styleSelect.querySelectorAll("option")).forEach(option => {
      const value = option.value as StyleKey;
      if (STYLE_LABEL[locale][value]) option.textContent = STYLE_LABEL[locale][value];
    });
  }
}

function boot() {
  initNicknameTool();
}

document.addEventListener("astro:page-load", boot);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  queueMicrotask(boot);
}
