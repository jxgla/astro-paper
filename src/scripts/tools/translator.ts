export {};

const TRANSLATOR_API_PATH = "/api/tools/translator";

type Locale = "zh" | "en";

type LangOption = { value: string; zh: string; en: string };

type ScriptStats = {
  latin: number;
  han: number;
  hiragana: number;
  katakana: number;
  hangul: number;
  cyrillic: number;
  arabic: number;
  devanagari: number;
  thai: number;
};

const LANGUAGE_OPTIONS: LangOption[] = [
  { value: "auto", zh: "自动检测", en: "Auto detect" },
  { value: "zh", zh: "中文", en: "Chinese" },
  { value: "en", zh: "英语", en: "English" },
  { value: "ja", zh: "日语", en: "Japanese" },
  { value: "ko", zh: "韩语", en: "Korean" },
  { value: "fr", zh: "法语", en: "French" },
  { value: "de", zh: "德语", en: "German" },
  { value: "es", zh: "西班牙语", en: "Spanish" },
  { value: "ru", zh: "俄语", en: "Russian" },
  { value: "ar", zh: "阿拉伯语", en: "Arabic" },
  { value: "pt", zh: "葡萄牙语", en: "Portuguese" },
  { value: "it", zh: "意大利语", en: "Italian" },
  { value: "hi", zh: "印地语", en: "Hindi" },
  { value: "th", zh: "泰语", en: "Thai" },
  { value: "vi", zh: "越南语", en: "Vietnamese" },
  { value: "id", zh: "印尼语", en: "Indonesian" },
];

const I18N = {
  zh: {
    missingText: "请先输入要翻译的文本。",
    missingTarget: "请选择目标语言。",
    translating: "翻译中...",
    success: "翻译完成。",
    failedPrefix: "翻译失败：",
    copied: "译文已复制。",
    copiedBilingual: "双语对照已复制。",
    copiedDetection: "检测结果已复制。",
    copyFailed: "复制失败，请手动复制。",
    swapDisabled: "源语言为自动检测时无法交换。",
    detectorIdle: "本地分析字符分布，不上传文本。",
    detectorDone: "检测完成。",
    detectorEmpty: "请先输入要检测的文本。",
    likelySource: "推测源语言",
    recommendedTarget: "推荐翻译目标",
  },
  en: {
    missingText: "Please enter text to translate.",
    missingTarget: "Please select a target language.",
    translating: "Translating...",
    success: "Translation complete.",
    failedPrefix: "Translation failed: ",
    copied: "Translation copied.",
    copiedBilingual: "Bilingual output copied.",
    copiedDetection: "Detection result copied.",
    copyFailed: "Copy failed. Please copy manually.",
    swapDisabled: "Cannot swap while source language is Auto detect.",
    detectorIdle: "Runs locally and only analyzes character/script distribution.",
    detectorDone: "Detection complete.",
    detectorEmpty: "Please enter text to inspect.",
    likelySource: "Likely source language",
    recommendedTarget: "Suggested translation target",
  },
} as const;

function buildOptions(locale: Locale, includeAuto: boolean) {
  return LANGUAGE_OPTIONS.filter(item => includeAuto || item.value !== "auto")
    .map(item => `<option value="${item.value}">${locale === "zh" ? item.zh : item.en}</option>`)
    .join("");
}

function getLanguageLabel(value: string, locale: Locale) {
  const item = LANGUAGE_OPTIONS.find(entry => entry.value === value);
  return item ? (locale === "zh" ? item.zh : item.en) : value;
}

function countMatches(text: string, pattern: RegExp) {
  return text.match(pattern)?.length ?? 0;
}

function getScriptStats(text: string): ScriptStats {
  return {
    latin: countMatches(text, /[A-Za-zÀ-ÿ]/g),
    han: countMatches(text, /\p{Script=Han}/gu),
    hiragana: countMatches(text, /\p{Script=Hiragana}/gu),
    katakana: countMatches(text, /\p{Script=Katakana}/gu),
    hangul: countMatches(text, /\p{Script=Hangul}/gu),
    cyrillic: countMatches(text, /\p{Script=Cyrillic}/gu),
    arabic: countMatches(text, /\p{Script=Arabic}/gu),
    devanagari: countMatches(text, /\p{Script=Devanagari}/gu),
    thai: countMatches(text, /\p{Script=Thai}/gu),
  };
}

function detectLanguage(text: string) {
  const stats = getScriptStats(text);
  const entries: Array<[string, number]> = [
    ["ja", stats.hiragana + stats.katakana + stats.han],
    ["zh", stats.han],
    ["ko", stats.hangul],
    ["ru", stats.cyrillic],
    ["ar", stats.arabic],
    ["hi", stats.devanagari],
    ["th", stats.thai],
    ["en", stats.latin],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  const dominant = entries[0]?.[0] || "auto";
  const target = dominant === "zh" ? "en" : dominant === "en" ? "zh" : "zh";
  return { dominant, target, stats };
}

function buildDetectionText(text: string, locale: Locale) {
  const { dominant, target, stats } = detectLanguage(text);
  const total = Object.values(stats).reduce((sum, value) => sum + value, 0) || 1;
  const detailLines: Array<[string, number]> = [
    ["Latin", stats.latin],
    ["Han", stats.han],
    ["Hiragana", stats.hiragana],
    ["Katakana", stats.katakana],
    ["Hangul", stats.hangul],
    ["Cyrillic", stats.cyrillic],
    ["Arabic", stats.arabic],
    ["Devanagari", stats.devanagari],
    ["Thai", stats.thai],
  ];

  const normalizedLines = detailLines
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${label}: ${count} (${((count / total) * 100).toFixed(1)}%)`);

  return {
    dominant,
    target,
    text: [
      `${I18N[locale].likelySource}: ${getLanguageLabel(dominant, locale)}`,
      `${I18N[locale].recommendedTarget}: ${getLanguageLabel(target, locale)}`,
      ...normalizedLines,
    ].join("\n"),
  };
}

function initLanguageDetector() {
  const forms = Array.from(document.querySelectorAll("[data-language-detector]"));
  for (const form of forms) {
    if (!(form instanceof HTMLElement) || form.dataset.inited === "1") continue;
    form.dataset.inited = "1";

    const locale: Locale = form.dataset.locale === "en" ? "en" : "zh";
    const t = I18N[locale];
    const inputEl = form.querySelector("[data-language-input]");
    const outputEl = form.querySelector("[data-language-output]");
    const statusEl = form.querySelector("[data-language-status]");
    const runBtn = form.querySelector("[data-language-run]");
    const copyBtn = form.querySelector("[data-language-copy]");
    const clearBtn = form.querySelector("[data-language-clear]");

    if (!(inputEl instanceof HTMLTextAreaElement)) continue;
    if (!(outputEl instanceof HTMLTextAreaElement)) continue;
    if (!(statusEl instanceof HTMLElement)) continue;
    if (!(runBtn instanceof HTMLButtonElement)) continue;
    if (!(copyBtn instanceof HTMLButtonElement)) continue;
    if (!(clearBtn instanceof HTMLButtonElement)) continue;

    const syncState = () => {
      copyBtn.disabled = !outputEl.value.trim();
    };

    runBtn.addEventListener("click", () => {
      const text = inputEl.value.trim();
      if (!text) {
        statusEl.textContent = t.detectorEmpty;
        return;
      }
      outputEl.value = buildDetectionText(text, locale).text;
      statusEl.textContent = t.detectorDone;
      syncState();
    });

    copyBtn.addEventListener("click", async () => {
      if (!outputEl.value.trim()) return;
      try {
        await navigator.clipboard.writeText(outputEl.value);
        statusEl.textContent = t.copiedDetection;
      } catch {
        statusEl.textContent = t.copyFailed;
      }
    });

    clearBtn.addEventListener("click", () => {
      inputEl.value = "";
      outputEl.value = "";
      statusEl.textContent = t.detectorIdle;
      syncState();
    });

    syncState();
  }
}

function buildParagraphAlignedBilingual(source: string, translated: string, locale: Locale) {
  const sourceParts = source.split(/\n{2,}/).map(part => part.trim()).filter(Boolean);
  const translatedParts = translated.split(/\n{2,}/).map(part => part.trim()).filter(Boolean);
  const count = Math.max(sourceParts.length, translatedParts.length);
  const blocks: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const sourceText = sourceParts[index] || "";
    const translatedText = translatedParts[index] || (index === 0 ? translated : "");
    if (!sourceText && !translatedText) continue;
    if (locale === "zh") {
      blocks.push(`原文 ${index + 1}\n${sourceText}\n\n译文 ${index + 1}\n${translatedText}`);
    } else {
      blocks.push(`Source ${index + 1}\n${sourceText}\n\nTranslation ${index + 1}\n${translatedText}`);
    }
  }

  return blocks.join("\n\n");
}

function buildBilingualText(source: string, translated: string, locale: Locale) {
  return buildParagraphAlignedBilingual(source, translated, locale);
}

function initTranslatorTool() {
  const forms = Array.from(document.querySelectorAll("[data-translate-form]"));
  for (const form of forms) {
    if (!(form instanceof HTMLFormElement) || form.dataset.inited === "1") continue;
    form.dataset.inited = "1";

    const inputEl = form.querySelector("[data-translate-input]");
    const sourceEl = form.querySelector("[data-translate-source]");
    const targetEl = form.querySelector("[data-translate-target]");
    const outputEl = form.querySelector("[data-translate-output]");
    const bilingualEl = form.querySelector("[data-translate-bilingual]");
    const statusEl = form.querySelector("[data-translate-status]");
    const detectedEl = form.querySelector("[data-translate-detected]");
    const submitBtn = form.querySelector("[data-translate-submit]");
    const copyBtn = form.querySelector("[data-translate-copy]");
    const copyBilingualBtn = form.querySelector("[data-translate-copy-bilingual]");
    const clearBtn = form.querySelector("[data-translate-clear]");
    const swapBtn = form.querySelector("[data-translate-swap]");

    if (!(inputEl instanceof HTMLTextAreaElement)) continue;
    if (!(sourceEl instanceof HTMLSelectElement)) continue;
    if (!(targetEl instanceof HTMLSelectElement)) continue;
    if (!(outputEl instanceof HTMLTextAreaElement)) continue;
    if (!(bilingualEl instanceof HTMLTextAreaElement)) continue;
    if (!(statusEl instanceof HTMLElement)) continue;
    if (!(detectedEl instanceof HTMLElement)) continue;
    if (!(submitBtn instanceof HTMLButtonElement)) continue;
    if (!(copyBtn instanceof HTMLButtonElement)) continue;
    if (!(copyBilingualBtn instanceof HTMLButtonElement)) continue;
    if (!(clearBtn instanceof HTMLButtonElement)) continue;
    if (!(swapBtn instanceof HTMLButtonElement)) continue;

    const locale: Locale = form.dataset.locale === "en" ? "en" : "zh";
    const t = I18N[locale];

    sourceEl.innerHTML = buildOptions(locale, true);
    targetEl.innerHTML = buildOptions(locale, false);

    sourceEl.value = "auto";
    targetEl.value = locale === "en" ? "zh" : "en";

    const apiBase = String(form.dataset.toolsApiBase || "").replace(/\/$/, "");
    const apiUrl = `${apiBase}${TRANSLATOR_API_PATH}`;

    let busy = false;

    const syncState = () => {
      copyBtn.disabled = !outputEl.value.trim();
      copyBilingualBtn.disabled = !bilingualEl.value.trim();
      submitBtn.disabled = busy;
      sourceEl.disabled = busy;
      targetEl.disabled = busy;
      inputEl.disabled = busy;
    };

    const setBusy = (next: boolean) => {
      busy = next;
      syncState();
    };

    const updateStatus = (msg: string) => {
      statusEl.textContent = msg;
    };

    const updateDetectionHint = (text: string) => {
      const sourceLanguage = sourceEl.value.trim() || "auto";
      if (!text) {
        detectedEl.textContent = "";
        return;
      }
      if (sourceLanguage === "auto") {
        detectedEl.textContent = buildDetectionText(text, locale).text;
      } else {
        detectedEl.textContent = `${t.likelySource}: ${getLanguageLabel(sourceLanguage, locale)}`;
      }
    };

    swapBtn.addEventListener("click", () => {
      if (sourceEl.value === "auto") {
        updateStatus(t.swapDisabled);
        return;
      }
      const from = sourceEl.value;
      sourceEl.value = targetEl.value;
      targetEl.value = from;
      const srcText = inputEl.value;
      inputEl.value = outputEl.value;
      outputEl.value = srcText;
      bilingualEl.value = buildBilingualText(inputEl.value, outputEl.value, locale);
      updateDetectionHint(inputEl.value);
      syncState();
    });

    inputEl.addEventListener("input", () => updateDetectionHint(inputEl.value));

    clearBtn.addEventListener("click", () => {
      inputEl.value = "";
      outputEl.value = "";
      bilingualEl.value = "";
      detectedEl.textContent = "";
      syncState();
    });

    copyBtn.addEventListener("click", async () => {
      if (!outputEl.value.trim()) return;
      try {
        await navigator.clipboard.writeText(outputEl.value);
        updateStatus(t.copied);
      } catch {
        updateStatus(t.copyFailed);
      }
    });

    copyBilingualBtn.addEventListener("click", async () => {
      if (!bilingualEl.value.trim()) return;
      try {
        await navigator.clipboard.writeText(bilingualEl.value);
        updateStatus(t.copiedBilingual);
      } catch {
        updateStatus(t.copyFailed);
      }
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (busy) return;

      const text = inputEl.value.trim();
      const sourceLanguage = sourceEl.value.trim() || "auto";
      const targetLanguage = targetEl.value.trim();

      if (!text) {
        updateStatus(t.missingText);
        return;
      }
      if (!targetLanguage) {
        updateStatus(t.missingTarget);
        return;
      }

      try {
        setBusy(true);
        updateStatus(t.translating);
        updateDetectionHint(text);

        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, sourceLanguage, targetLanguage }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          const msg = data?.error ? String(data.error) : `HTTP ${res.status}`;
          updateStatus(`${t.failedPrefix}${msg}`);
          return;
        }

        const translatedText = String(data.translatedText || "");
        outputEl.value = translatedText;
        bilingualEl.value = buildBilingualText(inputEl.value, translatedText, locale);
        syncState();
        updateStatus(t.success);
      } catch (err: any) {
        updateStatus(`${t.failedPrefix}${String(err?.message || "unknown")}`);
      } finally {
        setBusy(false);
      }
    });

    updateDetectionHint(inputEl.value);
    syncState();
  }
}

function init() {
  initLanguageDetector();
  initTranslatorTool();
}

document.addEventListener("astro:page-load", init);
document.addEventListener("DOMContentLoaded", init, { once: true });
queueMicrotask(init);
