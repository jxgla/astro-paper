type Locale = "en" | "zh";

export {};

const LABELS = {
  en: {
    placeholder: "Paste a chat snippet here (local only).",
    analyze: "Analyze",
    copy: "Copy",
    share: "Share card",
    statusReady: "Tip: this runs locally in your browser — nothing is uploaded.",
    statusCopied: "Copied.",
    statusCopyFail: "Copy failed. Please copy manually.",
    statusNeedText: "Please paste some text first.",
    topEmoji: "Top emojis",
    vibe: "Vibe",
    sweet: "Sweetness",
    spicy: "Spiciness",
    chaos: "Chaos",
    energy: "Energy",
    summary: "Summary",
  },
  zh: {
    placeholder: "把聊天片段粘贴到这里（本地分析，不上传）。",
    analyze: "开始分析",
    copy: "复制结果",
    share: "分享卡片",
    statusReady: "提示：纯本地分析，不上传任何内容。",
    statusCopied: "已复制。",
    statusCopyFail: "复制失败，请手动复制。",
    statusNeedText: "请先粘贴一些文本。",
    topEmoji: "高频表情",
    vibe: "气质",
    sweet: "甜度",
    spicy: "攻击性",
    chaos: "抽象度",
    energy: "社交能量",
    summary: "总结",
  },
} as const;

function safeLocale(raw: unknown): Locale {
  return raw === "zh" ? "zh" : "en";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function esc(v: unknown) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function tokenizeEmojis(text: string): string[] {
  // Fast approximate emoji matcher using Unicode property escapes.
  // Supported in modern browsers (Node 22 also supports, but this runs in browser).
  try {
    const re = /\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*?/gu;
    return Array.from(text.matchAll(re)).map(m => m[0]).filter(Boolean);
  } catch {
    // Fallback: common emoji ranges (rough)
    const re = /[\u{1F300}-\u{1FAFF}]/gu;
    return Array.from(text.matchAll(re)).map(m => m[0]).filter(Boolean);
  }
}

function scoreFromSignals(text: string, emojis: string[]) {
  const t = text;
  const ex = (t.match(/!/g) || []).length;
  const q = (t.match(/\?/g) || []).length;
  const dots = (t.match(/\.{3,}|…{2,}/g) || []).length;
  const haha = (t.match(/哈哈|hh|hahaha|lol/gi) || []).length;
  const caps = (t.match(/[A-Z]{3,}/g) || []).length;

  // Emoji-weight dictionary (lightweight + memey)
  const sweetSet = new Set(["🥺", "🥹", "😭", "💖", "💕", "💗", "✨", "🌙", "🫶", "🤍", "🥰", "😍", "😘"]);
  const spicySet = new Set(["😡", "🤬", "👿", "😤", "🙄", "💢", "🫠", "🖕"]);
  const chaosSet = new Set(["🤡", "💀", "🫥", "🫡", "😵", "🧠", "🌀", "🐒", "🦐", "🫧"]);
  const energySet = new Set(["😂", "🤣", "😅", "😆", "🔥", "⚡", "🎉", "🥳", "🏃"]);

  let sweet = 0;
  let spicy = 0;
  let chaos = 0;
  let energy = 0;

  for (const e of emojis) {
    if (sweetSet.has(e)) sweet += 3;
    if (spicySet.has(e)) spicy += 3;
    if (chaosSet.has(e)) chaos += 3;
    if (energySet.has(e)) energy += 2;
  }

  // Text signals
  sweet += (t.match(/宝宝|宝|亲亲|抱抱|想你|爱你/g) || []).length * 2;
  spicy += (t.match(/滚|烦|别来|闭嘴|傻|离谱/g) || []).length * 2;
  chaos += (t.match(/抽象|绷不住|笑死|我裂开|我人傻了/g) || []).length * 2;
  energy += ex + haha * 2 + caps;
  chaos += dots + q;

  // Normalize to 0..100
  const norm = (x: number, div = 30) => clamp(Math.round((x / div) * 100), 0, 100);
  return {
    sweet: norm(sweet, 28),
    spicy: norm(spicy, 24),
    chaos: norm(chaos, 26),
    energy: norm(energy, 22),
  };
}

function vibeLabel(locale: Locale, s: { sweet: number; spicy: number; chaos: number; energy: number }) {
  const maxKey = (Object.entries(s) as Array<[keyof typeof s, number]>).sort((a, b) => b[1] - a[1])[0]?.[0];
  const isZh = locale === "zh";
  switch (maxKey) {
    case "sweet":
      return isZh ? "软糖派" : "Softcore";
    case "spicy":
      return isZh ? "火药味" : "Spicy";
    case "chaos":
      return isZh ? "抽象王" : "Chaotic";
    case "energy":
      return isZh ? "高能量" : "High-energy";
    default:
      return isZh ? "未知气质" : "Unknown";
  }
}

function buildReport(locale: Locale, top: Array<[string, number]>, s: any, sampleLen: number) {
  const isZh = locale === "zh";
  const topLine = top.length
    ? top
        .slice(0, 8)
        .map(([e, c]) => `${e}×${c}`)
        .join(" ")
    : isZh
      ? "（没有检测到表情）"
      : "(no emojis detected)";

  const vibe = vibeLabel(locale, s);
  return isZh
    ? `【Emoji DNA】\n高频表情：${topLine}\n气质：${vibe}\n甜度：${s.sweet}/100\n攻击性：${s.spicy}/100\n抽象度：${s.chaos}/100\n社交能量：${s.energy}/100\n样本长度：${sampleLen} 字符\n\n（本地分析，不上传）`
    : `[Emoji DNA]\nTop emojis: ${topLine}\nVibe: ${vibe}\nSweetness: ${s.sweet}/100\nSpiciness: ${s.spicy}/100\nChaos: ${s.chaos}/100\nEnergy: ${s.energy}/100\nSample length: ${sampleLen} chars\n\n(Local only)`;
}

function buildSummary(locale: Locale, s: { sweet: number; spicy: number; chaos: number; energy: number }, vibe: string) {
  const isZh = locale === "zh";
  const sweetTag = s.sweet >= 70 ? (isZh ? "甜到犯规" : "Sweet overload") : s.sweet >= 40 ? (isZh ? "带点可爱" : "Warm") : (isZh ? "偏克制" : "Reserved");
  const spicyTag = s.spicy >= 70 ? (isZh ? "火力全开" : "Full spice") : s.spicy >= 40 ? (isZh ? "会阴阳怪气" : "Sassy") : (isZh ? "很文明" : "Polite");
  const chaosTag = s.chaos >= 70 ? (isZh ? "抽象之神" : "Chaotic") : s.chaos >= 40 ? (isZh ? "有点发疯" : "Unhinged") : (isZh ? "很正常" : "Normal");
  const energyTag = s.energy >= 70 ? (isZh ? "高能量" : "High energy") : s.energy >= 40 ? (isZh ? "在线" : "Present") : (isZh ? "低电量" : "Low battery");

  return isZh
    ? `气质：${vibe}\n标签：${sweetTag} / ${spicyTag} / ${chaosTag} / ${energyTag}\n建议：\n- 甜度太高就别再“哈哈”了，容易暴露在乎\n- 抽象太高就少用省略号，容易被误判为冷淡`
    : `Vibe: ${vibe}\nTags: ${sweetTag} / ${spicyTag} / ${chaosTag} / ${energyTag}\nTips:\n- If you're too sweet, stop overusing "lol" — it leaks feelings\n- If chaos is high, reduce ellipses — people read it as cold`;
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

function initEmojiDnaTool() {
  const roots = Array.from(document.querySelectorAll("[data-emoji-dna]"));
  for (const root of roots) {
    if (!(root instanceof HTMLElement)) continue;
    if (root.dataset.inited === "1") continue;
    root.dataset.inited = "1";

    const locale = safeLocale(root.dataset.locale);
    const L = LABELS[locale];

    const input = root.querySelector("[data-emoji-dna-input]");
    const analyzeBtn = root.querySelector("[data-emoji-dna-analyze]");
    const copyBtn = root.querySelector("[data-emoji-dna-copy]");
    const shareBtn = root.querySelector("[data-emoji-dna-share]");
    const status = root.querySelector("[data-emoji-dna-status]");
    const topEl = root.querySelector("[data-emoji-dna-top]");
    const vibeEl = root.querySelector("[data-emoji-dna-vibe]");
    const summaryEl = root.querySelector("[data-emoji-dna-summary]");
    const bars = {
      sweet: root.querySelector("[data-emoji-dna-sweet]") as HTMLElement | null,
      spicy: root.querySelector("[data-emoji-dna-spicy]") as HTMLElement | null,
      chaos: root.querySelector("[data-emoji-dna-chaos]") as HTMLElement | null,
      energy: root.querySelector("[data-emoji-dna-energy]") as HTMLElement | null,
    };

    if (!(input instanceof HTMLTextAreaElement)) continue;
    if (!(analyzeBtn instanceof HTMLButtonElement)) continue;
    if (!(copyBtn instanceof HTMLButtonElement)) continue;
    if (!(shareBtn instanceof HTMLButtonElement)) continue;
    if (!(status instanceof HTMLElement)) continue;
    if (!(topEl instanceof HTMLElement)) continue;
    if (!(vibeEl instanceof HTMLElement)) continue;
    if (!(summaryEl instanceof HTMLElement)) continue;

    let lastReport = "";

    const setBar = (el: HTMLElement | null, v: number) => {
      if (!el) return;
      el.style.setProperty("--bar", `${clamp(v, 0, 100)}%`);
      el.setAttribute("data-val", String(clamp(v, 0, 100)));
    };

    const render = (text: string) => {
      const emojis = tokenizeEmojis(text);
      const freq = new Map<string, number>();
      for (const e of emojis) freq.set(e, (freq.get(e) || 0) + 1);
      const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

      const s = scoreFromSignals(text, emojis);
      const vibe = vibeLabel(locale, s);

      topEl.innerHTML = top.length
        ? top.map(([e, c]) => `<span class=\"emoji-pill\">${esc(e)} <small>×${c}</small></span>`).join(" ")
        : locale === "zh"
          ? "（未检测到表情）"
          : "(no emojis detected)";

      vibeEl.textContent = vibe;
      summaryEl.textContent = buildSummary(locale, s, vibe);
      setBar(bars.sweet, s.sweet);
      setBar(bars.spicy, s.spicy);
      setBar(bars.chaos, s.chaos);
      setBar(bars.energy, s.energy);

      lastReport = buildReport(locale, top as any, s, text.length);
      copyBtn.disabled = !lastReport;
      shareBtn.disabled = !lastReport;
    };

    status.textContent = L.statusReady;
    copyBtn.disabled = true;
    shareBtn.disabled = true;

    analyzeBtn.addEventListener("click", () => {
      const text = (input.value || "").trim();
      if (!text) {
        status.textContent = L.statusNeedText;
        return;
      }
      render(text);
      status.textContent = "OK";
    });

    copyBtn.addEventListener("click", async () => {
      if (!lastReport) return;
      try {
        await copyText(lastReport);
        status.textContent = L.statusCopied;
      } catch {
        status.textContent = L.statusCopyFail;
      }
    });

    shareBtn.addEventListener("click", () => {
      // Initial version: same as copy (no canvas poster yet).
      // We keep the button so we can upgrade later without changing HTML.
      if (!lastReport) return;
      try {
        downloadTextFile("emoji-dna.txt", lastReport);
        status.textContent = "OK";
      } catch {
        // noop
      }
    });

    function downloadTextFile(filename: string, text: string) {
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  }
}

function boot() {
  initEmojiDnaTool();
}

document.addEventListener("astro:page-load", boot);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  queueMicrotask(boot);
}
