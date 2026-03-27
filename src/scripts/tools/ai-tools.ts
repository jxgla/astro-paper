export {};

const AI_API_PATH = "/api/tools/ai-text";

type Locale = "zh" | "en";

type AiResponse = {
  ok?: boolean;
  output?: string;
  variants?: string[];
  note?: string;
  requestId?: string;
  error?: string;
  model?: string;
};

type ToolDefaults = {
  status: string;
  outputLabel?: string;
};

const I18N = {
  zh: {
    inputRequired: "请先输入内容。",
    tooLong: (max: number) => `输入内容过长，请控制在 ${max} 字以内。`,
    generating: "生成中...",
    copied: "已复制结果。",
    copyFailed: "复制失败，请手动复制。",
    cleared: "已清空。",
    failedPrefix: "生成失败：",
    done: "已生成。",
    rerolled: "已重新生成。",
    pickVariant: "可点下方候选项快速替换结果。",
    remaining: (count: number) => `还可输入 ${count} 字。`,
    requestId: (id: string) => `请求 ID: ${id}`,
    usingModel: (model: string) => `模型：${model}`,
    copiedVariant: "已切换候选版本。",
  },
  en: {
    inputRequired: "Please enter some text first.",
    tooLong: (max: number) => `Input is too long. Please keep it under ${max} characters.`,
    generating: "Generating...",
    copied: "Copied result.",
    copyFailed: "Copy failed. Please copy manually.",
    cleared: "Cleared.",
    failedPrefix: "Generation failed: ",
    done: "Done.",
    rerolled: "Rerolled.",
    pickVariant: "Click an option below to replace the current result.",
    remaining: (count: number) => `${count} characters remaining.`,
    requestId: (id: string) => `Request ID: ${id}`,
    usingModel: (model: string) => `Model: ${model}`,
    copiedVariant: "Alternative applied.",
  },
} as const;

const TOOL_DEFAULTS: Record<string, Record<Locale, ToolDefaults>> = {
  "tone-rewriter": {
    zh: { status: "适合发送前做最后一轮口吻润色。", outputLabel: "结果" },
    en: { status: "Useful for polishing messages before sending them.", outputLabel: "Result" },
  },
  summarizer: {
    zh: { status: "适合先快速压缩，再决定是否继续细读。", outputLabel: "摘要结果" },
    en: { status: "Good for trimming long text into something fast to review.", outputLabel: "Summary" },
  },
  "prompt-optimizer": {
    zh: { status: "适合你知道目标，但不知道怎样把需求说清楚的时候。", outputLabel: "优化后的 Prompt" },
    en: { status: "Best when you know the goal but want a clearer AI-ready instruction.", outputLabel: "Optimized prompt" },
  },
  "headline-rewriter": {
    zh: { status: "适合标题意思对了，但还不够抓眼的时候。", outputLabel: "已选标题" },
    en: { status: "Helpful when your original title is clear but not punchy enough.", outputLabel: "Selected headline" },
  },
  "bio-generator": {
    zh: { status: "适合需要一段短、干净、可直接粘贴的自我介绍时使用。", outputLabel: "生成结果" },
    en: { status: "Useful when you need something short, clean, and easy to paste.", outputLabel: "Generated bio" },
  },
  "meme-text": {
    zh: { status: "更适合短句梗文，不适合长笑话或完整段子。", outputLabel: "生成结果" },
    en: { status: "Best for short shareable text instead of full jokes or essays.", outputLabel: "Generated text" },
  },
  "social-compressor": {
    zh: { status: "适合你已经写太长，想快速压成可发版本的时候。", outputLabel: "压缩结果" },
    en: { status: "Good when you already wrote too much and need something post-ready.", outputLabel: "Compressed version" },
  },
};

function safeLocale(raw: string | undefined): Locale {
  return raw === "en" ? "en" : "zh";
}

function uniqueNonEmpty(values: unknown, limit = 8) {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .map(value => String(value || "").trim())
        .filter(Boolean)
    )
  ).slice(0, limit);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderOptions(container: HTMLElement, values: string[], onPick: (value: string) => void) {
  container.innerHTML = values
    .map(
      (value, index) => `
        <button class="nickname-tile" type="button" data-ai-option data-i="${index}" title="${escapeHtml(value)}">
          <span>${escapeHtml(value)}</span>
        </button>
      `
    )
    .join("");

  container.querySelectorAll<HTMLElement>("[data-ai-option]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.i || 0);
      const picked = values[index] || "";
      if (!picked) return;
      onPick(picked);
      button.classList.add("is-copied");
      window.setTimeout(() => button.classList.remove("is-copied"), 650);
    });
  });
}

function initAiTextTools() {
  const forms = document.querySelectorAll<HTMLElement>("[data-ai-text-tool]");
  forms.forEach(root => {
    if (root.dataset.inited === "1") return;
    root.dataset.inited = "1";

    const locale = safeLocale(root.dataset.locale);
    const t = I18N[locale];
    const tool = String(root.dataset.toolId || "").trim();
    const defaults = TOOL_DEFAULTS[tool]?.[locale];
    const maxInput = Number(root.dataset.maxInput || 4000);
    const apiBase = String(root.dataset.toolsApiBase || "").replace(/\/$/, "");
    const apiUrl = `${apiBase}${AI_API_PATH}`;

    const input = root.querySelector<HTMLTextAreaElement>("[data-ai-input]");
    const mode = root.querySelector<HTMLSelectElement>("[data-ai-mode]");
    const output = root.querySelector<HTMLTextAreaElement>("[data-ai-output]");
    const outputLabel = root.querySelector<HTMLElement>("[data-ai-output-label]");
    const note = root.querySelector<HTMLElement>("[data-ai-note]");
    const status = root.querySelector<HTMLElement>("[data-ai-status]");
    const submit = root.querySelector<HTMLButtonElement>("[data-ai-submit]");
    const reroll = root.querySelector<HTMLButtonElement>("[data-ai-reroll]");
    const copy = root.querySelector<HTMLButtonElement>("[data-ai-copy]");
    const clear = root.querySelector<HTMLButtonElement>("[data-ai-clear]");
    const optionsWrap = root.querySelector<HTMLElement>("[data-ai-options-wrap]");
    const options = root.querySelector<HTMLElement>("[data-ai-options]");
    if (!input || !mode || !output || !note || !status || !submit || !reroll || !copy || !clear || !optionsWrap || !options) return;

    if (outputLabel && defaults?.outputLabel) {
      outputLabel.textContent = defaults.outputLabel;
    }

    let busy = false;
    let lastVariants: string[] = [];

    const sync = () => {
      const hasOutput = !!output.value.trim();
      copy.disabled = !hasOutput;
      reroll.disabled = busy || !input.value.trim();
      submit.disabled = busy;
      input.disabled = busy;
      mode.disabled = busy;
    };

    const setBusy = (next: boolean) => {
      busy = next;
      sync();
    };

    const setNote = (value: string) => {
      note.textContent = value;
      note.hidden = !value.trim();
    };

    const setMeta = (data: AiResponse) => {
      const bits: string[] = [];
      if (data.note) bits.push(String(data.note).trim());
      if (data.model) bits.push(t.usingModel(String(data.model).trim()));
      if (data.requestId) bits.push(t.requestId(String(data.requestId).trim()));
      setNote(bits.filter(Boolean).join(" · "));
    };

    const setVariants = (values: string[]) => {
      lastVariants = uniqueNonEmpty(values);
      if (!lastVariants.length) {
        options.innerHTML = "";
        optionsWrap.hidden = true;
        return;
      }
      optionsWrap.hidden = false;
      renderOptions(options, lastVariants, picked => {
        output.value = picked;
        status.textContent = t.copiedVariant;
        sync();
      });
    };

    const applyResponse = (data: AiResponse, rerolled: boolean) => {
      const primary = String(data.output || "").trim();
      const variants = uniqueNonEmpty(data.variants || []);
      output.value = primary || variants[0] || "";
      setVariants(variants.filter(item => item !== output.value));
      setMeta(data);
      status.textContent = rerolled ? t.rerolled : t.done;
      sync();
    };

    const run = async (isReroll: boolean) => {
      const raw = input.value.trim();
      if (!raw) {
        status.textContent = t.inputRequired;
        return;
      }
      if (raw.length > maxInput) {
        status.textContent = t.tooLong(maxInput);
        return;
      }

      try {
        setBusy(true);
        status.textContent = t.generating;
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool,
            mode: mode.value,
            input: raw,
            locale,
            reroll: isReroll,
          }),
        });
        const data = (await response.json().catch(() => ({}))) as AiResponse;
        if (!response.ok || !data?.ok) {
          const errorMessage = String(data?.error || `HTTP ${response.status}`);
          status.textContent = `${t.failedPrefix}${errorMessage}`;
          return;
        }
        applyResponse(data, isReroll);
      } catch (error) {
        status.textContent = `${t.failedPrefix}${error instanceof Error ? error.message : "unknown"}`;
      } finally {
        setBusy(false);
      }
    };

    submit.addEventListener("click", () => {
      void run(false);
    });
    reroll.addEventListener("click", () => {
      void run(true);
    });
    copy.addEventListener("click", async () => {
      if (!output.value.trim()) return;
      try {
        await navigator.clipboard.writeText(output.value);
        status.textContent = t.copied;
      } catch {
        status.textContent = t.copyFailed;
      }
    });
    clear.addEventListener("click", () => {
      input.value = "";
      output.value = "";
      setVariants([]);
      setNote("");
      status.textContent = t.cleared;
      sync();
    });
    input.addEventListener("input", () => {
      const remaining = Math.max(0, maxInput - input.value.length);
      status.textContent = t.remaining(remaining);
      sync();
    });

    sync();
    if (!input.value.trim()) {
      status.textContent = defaults?.status || t.remaining(maxInput);
    }
  });
}

function init() {
  initAiTextTools();
}

document.addEventListener("astro:page-load", init);
document.addEventListener("DOMContentLoaded", init, { once: true });
queueMicrotask(init);
