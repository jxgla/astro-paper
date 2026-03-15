type Locale = "en" | "zh";

export {};

const LABELS = {
  en: {
    title: "Astro Roast",
    date: "Birthday (optional)",
    sign: "Zodiac (optional)",
    mode: "Mode",
    mystic: "Mystic",
    skeptic: "Skeptic",
    generate: "Generate",
    copy: "Copy",
    statusReady: "Entertainment only. Runs locally.",
    needOne: "Pick a birthday or a zodiac sign.",
    copied: "Copied.",
    copyFail: "Copy failed.",
  },
  zh: {
    title: "星座嘴替",
    date: "生日（可选）",
    sign: "星座（可选）",
    mode: "模式",
    mystic: "玄学嘴替",
    skeptic: "理工嘴硬",
    generate: "生成",
    copy: "复制",
    statusReady: "仅供娱乐，纯本地生成。",
    needOne: "请选择生日或星座。",
    copied: "已复制。",
    copyFail: "复制失败。",
  },
} as const;

type Mode = "mystic" | "skeptic";

const SIGNS = [
  { key: "aries", zh: "白羊座", en: "Aries" },
  { key: "taurus", zh: "金牛座", en: "Taurus" },
  { key: "gemini", zh: "双子座", en: "Gemini" },
  { key: "cancer", zh: "巨蟹座", en: "Cancer" },
  { key: "leo", zh: "狮子座", en: "Leo" },
  { key: "virgo", zh: "处女座", en: "Virgo" },
  { key: "libra", zh: "天秤座", en: "Libra" },
  { key: "scorpio", zh: "天蝎座", en: "Scorpio" },
  { key: "sagittarius", zh: "射手座", en: "Sagittarius" },
  { key: "capricorn", zh: "摩羯座", en: "Capricorn" },
  { key: "aquarius", zh: "水瓶座", en: "Aquarius" },
  { key: "pisces", zh: "双鱼座", en: "Pisces" },
] as const;

function safeLocale(raw: unknown): Locale {
  return raw === "zh" ? "zh" : "en";
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

function pick<T>(rnd: () => number, arr: readonly T[]) {
  return arr[Math.floor(rnd() * arr.length)];
}

function zodiacFromDate(yyyyMmDd: string): (typeof SIGNS)[number] | null {
  // Very rough zodiac date ranges.
  const d = new Date(`${yyyyMmDd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const m = d.getMonth() + 1;
  const day = d.getDate();

  const mmdd = m * 100 + day;
  const inRange = (a: number, b: number) => (a <= b ? mmdd >= a && mmdd <= b : mmdd >= a || mmdd <= b);

  if (inRange(321, 419)) return SIGNS[0];
  if (inRange(420, 520)) return SIGNS[1];
  if (inRange(521, 620)) return SIGNS[2];
  if (inRange(621, 722)) return SIGNS[3];
  if (inRange(723, 822)) return SIGNS[4];
  if (inRange(823, 922)) return SIGNS[5];
  if (inRange(923, 1022)) return SIGNS[6];
  if (inRange(1023, 1121)) return SIGNS[7];
  if (inRange(1122, 1221)) return SIGNS[8];
  if (inRange(1222, 119)) return SIGNS[9];
  if (inRange(120, 218)) return SIGNS[10];
  return SIGNS[11];
}

function roast(locale: Locale, sign: (typeof SIGNS)[number], mode: Mode, seed: string) {
  const rnd = mulberry32(hashSeed(seed));

  const isZh = locale === "zh";
  const signName = isZh ? sign.zh : sign.en;

  const mysticOpen = isZh
    ? [
        "今天的宇宙信号很明显：别硬扛。",
        "你最近的能量场：像 Wi‑Fi 一样忽强忽弱。",
        "你的气场：看起来冷，但其实很好哄。",
      ]
    : [
        "The universe has a message: stop forcing it.",
        "Your energy lately is like Wi‑Fi—unstable but present.",
        "Your aura looks cold, but you're actually easy to soften.",
      ];

  const mysticCore = isZh
    ? [
        "贵人运：在“你懒得社交”的那天出现。",
        "桃花运：来得快也走得快，别急着上头。",
        "财运：小钱不断，大钱要靠你认真那一次。",
        "事业运：别跟情绪做项目，跟计划做项目。",
      ]
    : [
        "Luck shows up on the exact day you refuse to socialize.",
        "Romance is fast—don't speedrun attachment.",
        "Money: small wins keep coming; the big one needs one serious push.",
        "Career: stop building with emotions. Build with a plan.",
      ];

  const skepticOpen = isZh
    ? [
        "科学嘴硬模式启动：以下内容纯属娱乐，但你会觉得很准。",
        "提醒：星座无法预测未来，但可以预测你会不会熬夜。",
        "这是一个统计学意义上的“自我投射”生成器。",
      ]
    : [
        "Skeptic mode: entertainment only, but you'll still feel called out.",
        "Reminder: zodiac can't predict the future, but it can predict bedtime betrayal.",
        "This is basically self-projection with extra seasoning.",
      ];

  const skepticCore = isZh
    ? [
        "你觉得它准，是因为它说的是“高概率人类行为”。",
        "你需要的不是运势，是睡眠、喝水和一个清单。",
        "你最强的天赋：临时抱佛脚并且真的能抱住。",
        "今天的建议：把‘我再想想’改成‘我先做 10 分钟’。",
      ]
    : [
        "It feels accurate because it's describing high-probability human behavior.",
        "You don't need fate—you need sleep, water, and a checklist.",
        "Your superpower: last-minute focus that somehow works.",
        "Today: replace “I'll think about it” with “I'll do 10 minutes.”",
      ];

  const closer = isZh
    ? [
        "一句话总结：别内耗，去做。",
        "一句话总结：你已经很强了，别再用焦虑证明。",
        "一句话总结：保持可爱，保持边界。",
      ]
    : [
        "One-line summary: stop spiraling, start doing.",
        "One-line summary: you're strong—stop using anxiety as proof.",
        "One-line summary: stay kind, keep boundaries.",
      ];

  const open = mode === "mystic" ? pick(rnd, mysticOpen) : pick(rnd, skepticOpen);
  const core = mode === "mystic" ? pick(rnd, mysticCore) : pick(rnd, skepticCore);
  const tail = pick(rnd, closer);

  return isZh
    ? `【星座嘴替】${signName}\n${open}\n${core}\n${tail}\n\n（仅供娱乐）`
    : `[Astro Roast] ${signName}\n${open}\n${core}\n${tail}\n\n(Entertainment only)`;
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

function initAstroRoast() {
  const roots = Array.from(document.querySelectorAll("[data-astro-roast]"));
  for (const root of roots) {
    if (!(root instanceof HTMLElement)) continue;
    if (root.dataset.inited === "1") continue;
    root.dataset.inited = "1";

    const locale = safeLocale(root.dataset.locale);
    const L = LABELS[locale];

    const dateInput = root.querySelector("[data-astro-date]");
    const signSelect = root.querySelector("[data-astro-sign]");
    const modeSelect = root.querySelector("[data-astro-mode]");
    const genBtn = root.querySelector("[data-astro-generate]");
    const copyBtn = root.querySelector("[data-astro-copy]");
    const status = root.querySelector("[data-astro-status]");
    const out = root.querySelector("[data-astro-output]");

    if (!(dateInput instanceof HTMLInputElement)) continue;
    if (!(signSelect instanceof HTMLSelectElement)) continue;
    if (!(modeSelect instanceof HTMLSelectElement)) continue;
    if (!(genBtn instanceof HTMLButtonElement)) continue;
    if (!(copyBtn instanceof HTMLButtonElement)) continue;
    if (!(status instanceof HTMLElement)) continue;
    if (!(out instanceof HTMLElement)) continue;

    status.textContent = L.statusReady;
    copyBtn.disabled = true;

    let last = "";

    genBtn.addEventListener("click", () => {
      const date = String(dateInput.value || "").trim();
      const signKey = String(signSelect.value || "").trim();
      const mode = (String(modeSelect.value || "mystic") as Mode) || "mystic";

      const sign = date ? zodiacFromDate(date) : (SIGNS as any).find((s: any) => s.key === signKey) || null;
      if (!sign) {
        status.textContent = L.needOne;
        return;
      }

      const seed = `${sign.key}|${mode}|${date || "na"}|${Date.now()}`;
      last = roast(locale, sign, mode, seed);
      out.textContent = last;
      copyBtn.disabled = !last;
      status.textContent = "OK";
    });

    copyBtn.addEventListener("click", async () => {
      if (!last) return;
      try {
        await copyText(last);
        status.textContent = L.copied;
      } catch {
        status.textContent = L.copyFail;
      }
    });

    // populate sign labels
    if (signSelect.querySelectorAll("option").length <= 1) {
      for (const s of SIGNS) {
        const opt = document.createElement("option");
        opt.value = s.key;
        opt.textContent = locale === "zh" ? s.zh : s.en;
        signSelect.appendChild(opt);
      }
    }
  }
}

function boot() {
  initAstroRoast();
}

document.addEventListener("astro:page-load", boot);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  queueMicrotask(boot);
}
