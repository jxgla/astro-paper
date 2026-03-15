type Locale = "en" | "zh";

export {};

type StyleKey = "cyber" | "xianxia" | "minimal" | "japan" | "abstract" | "emo" | "biz";

const LABELS = {
  en: {
    title: "Nickname Generator",
    keyword: "Keyword (optional)",
    style: "Style",
    generate: "Generate",
    more: "More",
    copyAll: "Copy all",
    saved: "Saved",
    statusReady: "Generate names locally. No network.",
    copied: "Copied.",
    copyFail: "Copy failed.",
  },
  zh: {
    title: "网名生成器",
    keyword: "关键词（可选）",
    style: "风格",
    generate: "生成",
    more: "再来一批",
    copyAll: "复制全部",
    saved: "已收藏",
    statusReady: "纯本地生成，不联网。",
    copied: "已复制。",
    copyFail: "复制失败。",
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
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(rnd: () => number, arr: T[]) {
  return arr[Math.floor(rnd() * arr.length)];
}

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

function normalizeKeyword(raw: string) {
  const s = String(raw || "").trim();
  if (!s) return "";
  return s.slice(0, 16);
}

function makeOne(rnd: () => number, style: StyleKey, keyword: string) {
  const lib = (LIB as any)[style];
  const k = keyword;
  const a = pick(rnd, lib.pre);
  const b = pick(rnd, lib.mid);
  const c = pick(rnd, lib.suf);
  // Mix keyword with probability.
  if (k && rnd() < 0.55) {
    const pos = rnd();
    if (pos < 0.33) return `${k}${b}${a}${c}`;
    if (pos < 0.66) return `${a}${b}${k}${c}`;
    return `${a}${b}${c}${b}${k}`;
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
    const genBtn = root.querySelector("[data-nickname-generate]");
    const moreBtn = root.querySelector("[data-nickname-more]");
    const copyAllBtn = root.querySelector("[data-nickname-copyall]");
    const status = root.querySelector("[data-nickname-status]");
    const list = root.querySelector("[data-nickname-list]");

    if (!(keywordInput instanceof HTMLInputElement)) continue;
    if (!(styleSelect instanceof HTMLSelectElement)) continue;
    if (!(genBtn instanceof HTMLButtonElement)) continue;
    if (!(moreBtn instanceof HTMLButtonElement)) continue;
    if (!(copyAllBtn instanceof HTMLButtonElement)) continue;
    if (!(status instanceof HTMLElement)) continue;
    if (!(list instanceof HTMLElement)) continue;

    status.textContent = L.statusReady;

    let seedBase = Date.now();
    let lastNames: string[] = [];

    const renderList = (names: string[]) => {
      list.innerHTML = names
        .map(
          (n, idx) => `
          <div class="nickname-row">
            <div class="nickname-text" title="${n}">${n}</div>
            <button class="tool-btn-secondary" type="button" data-nickname-copy data-i="${idx}">${locale === "zh" ? "复制" : "Copy"}</button>
          </div>
        `
        )
        .join("");

      list.querySelectorAll("[data-nickname-copy]").forEach(btn => {
        btn.addEventListener("click", async () => {
          const i = Number((btn as HTMLElement).getAttribute("data-i") || 0);
          const text = names[i] || "";
          if (!text) return;
          try {
            await copyText(text);
            status.textContent = L.copied;
          } catch {
            status.textContent = L.copyFail;
          }
        });
      });

      copyAllBtn.disabled = names.length === 0;
    };

    const generate = (bumpSeed: boolean) => {
      const style = (styleSelect.value as StyleKey) || "cyber";
      const keyword = normalizeKeyword(keywordInput.value);
      if (bumpSeed) seedBase += 1;
      const seed = hashSeed(`${style}|${keyword}|${seedBase}`);
      const rnd = mulberry32(seed);

      const out: string[] = [];
      const target = 20;
      const seen = new Set<string>();
      while (out.length < target) {
        const name = makeOne(rnd, style, keyword);
        const cleaned = String(name).replace(/\s{2,}/g, " ").trim();
        if (!cleaned) continue;
        if (cleaned.length > 24) continue;
        if (seen.has(cleaned)) continue;
        seen.add(cleaned);
        out.push(cleaned);
      }
      lastNames = out;
      renderList(out);
    };

    genBtn.addEventListener("click", () => generate(false));
    moreBtn.addEventListener("click", () => generate(true));

    copyAllBtn.addEventListener("click", async () => {
      if (!lastNames.length) return;
      try {
        await copyText(lastNames.join("\n"));
        status.textContent = L.copied;
      } catch {
        status.textContent = L.copyFail;
      }
    });

    // initial
    // Populate style labels.
    Array.from(styleSelect.querySelectorAll("option")).forEach(opt => {
      const v = opt.value as StyleKey;
      if ((STYLE_LABEL[locale] as any)[v]) opt.textContent = (STYLE_LABEL[locale] as any)[v];
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
