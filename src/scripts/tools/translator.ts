export {};

const TRANSLATOR_API_PATH = "/api/tools/translator";

type Locale = "zh" | "en";

type LangOption = { value: string; zh: string; en: string };

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
    copyFailed: "复制失败，请手动复制。",
    swapDisabled: "源语言为自动检测时无法交换。",
  },
  en: {
    missingText: "Please enter text to translate.",
    missingTarget: "Please select a target language.",
    translating: "Translating...",
    success: "Translation complete.",
    failedPrefix: "Translation failed: ",
    copied: "Translation copied.",
    copyFailed: "Copy failed. Please copy manually.",
    swapDisabled: "Cannot swap while source language is Auto detect.",
  },
} as const;

function buildOptions(locale: Locale, includeAuto: boolean) {
  return LANGUAGE_OPTIONS.filter(item => includeAuto || item.value !== "auto")
    .map(item => `<option value="${item.value}">${locale === "zh" ? item.zh : item.en}</option>`)
    .join("");
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
    const statusEl = form.querySelector("[data-translate-status]");
    const submitBtn = form.querySelector("[data-translate-submit]");
    const copyBtn = form.querySelector("[data-translate-copy]");
    const clearBtn = form.querySelector("[data-translate-clear]");
    const swapBtn = form.querySelector("[data-translate-swap]");

    if (!(inputEl instanceof HTMLTextAreaElement)) continue;
    if (!(sourceEl instanceof HTMLSelectElement)) continue;
    if (!(targetEl instanceof HTMLSelectElement)) continue;
    if (!(outputEl instanceof HTMLTextAreaElement)) continue;
    if (!(statusEl instanceof HTMLElement)) continue;
    if (!(submitBtn instanceof HTMLButtonElement)) continue;
    if (!(copyBtn instanceof HTMLButtonElement)) continue;
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
      syncState();
    });

    clearBtn.addEventListener("click", () => {
      inputEl.value = "";
      outputEl.value = "";
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

        outputEl.value = String(data.translatedText || "");
        syncState();
        updateStatus(t.success);
      } catch (err: any) {
        updateStatus(`${t.failedPrefix}${String(err?.message || "unknown")}`);
      } finally {
        setBusy(false);
      }
    });

    syncState();
  }
}

document.addEventListener("astro:page-load", initTranslatorTool);
