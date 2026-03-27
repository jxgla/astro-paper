export {};

const AI_API_PATH = "/api/tools/ai-text";
const AI_DIRECT_URL = import.meta.env.DEV ? "http://localhost:8787/v1/chat" : "https://mirror.410666.xyz/v1/chat";
const AI_DIRECT_MODEL = "grok-4.1-fast";

type Locale = "zh" | "en";
type ToolId = "tone-rewriter" | "summarizer" | "prompt-optimizer" | "headline-rewriter" | "bio-generator" | "meme-text" | "social-compressor";

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

type ToolConfig = {
  outputLimit: number;
  noteLimit: number;
  modes: string[];
  prompt: (params: { input: string; mode: string; locale: Locale; reroll: boolean }) => string;
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
    remaining: (count: number) => `${count} characters remaining.`,
    requestId: (id: string) => `Request ID: ${id}`,
    usingModel: (model: string) => `Model: ${model}`,
    copiedVariant: "Alternative applied.",
  },
} as const;

const TOOL_DEFAULTS: Record<ToolId, Record<Locale, ToolDefaults>> = {
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

function clampText(value: unknown, maxLength: number) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}…` : text;
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

function buildJsonInstruction(locale: Locale, outputLimit: number, variantMin: number, variantMax: number, noteLimit: number, extraRules: string) {
  if (locale === "en") {
    return [
      "Return valid JSON only.",
      'Use exactly this shape: {"output":"...","variants":["..."],"note":"..."}.',
      `output must be one string under ${outputLimit} characters.`,
      `variants must contain ${variantMin}-${variantMax} unique strings, each under ${outputLimit} characters.`,
      `note must be one short string under ${noteLimit} characters.`,
      "Do not use markdown fences.",
      extraRules,
    ].join(" ");
  }

  return [
    "只返回合法 JSON。",
    '严格使用这个结构：{"output":"...","variants":["..."],"note":"..."}。',
    `output 必须是 1 个不超过 ${outputLimit} 字符的字符串。`,
    `variants 必须给出 ${variantMin}-${variantMax} 个互不重复的候选，每个不超过 ${outputLimit} 字符。`,
    `note 必须是 1 个不超过 ${noteLimit} 字符的短说明。`,
    "不要使用 markdown 代码块。",
    extraRules,
  ].join(" ");
}

const TOOL_CONFIG: Record<ToolId, ToolConfig> = {
  "tone-rewriter": {
    outputLimit: 900,
    noteLimit: 120,
    modes: ["polite", "concise", "formal", "casual", "support", "pm"],
    prompt: ({ input, mode, locale }) => {
      const targetTone = {
        polite: locale === "en" ? "more polite and friendly" : "更礼貌、更体面",
        concise: locale === "en" ? "more concise" : "更简洁",
        formal: locale === "en" ? "more formal and professional" : "更正式、更专业",
        casual: locale === "en" ? "more casual and natural" : "更随意、更自然",
        support: locale === "en" ? "like a customer-support reply" : "像客服回复",
        pm: locale === "en" ? "like a product manager update" : "像产品经理同步",
      }[mode] || (locale === "en" ? "more polite and friendly" : "更礼貌、更体面");
      const instruction = buildJsonInstruction(
        locale,
        900,
        3,
        4,
        120,
        locale === "en"
          ? "Preserve meaning, do not add facts, and keep the source language unless that would feel unnatural."
          : "保持原意，不要新增事实；除非非常不自然，否则保持原文本语言。"
      );
      return locale === "en"
        ? `Rewrite the text below so it sounds ${targetTone}. ${instruction}\n\nTEXT:\n${input}`
        : `请把下面文本改写成${targetTone}的表达。${instruction}\n\n文本：\n${input}`;
    },
  },
  summarizer: {
    outputLimit: 1200,
    noteLimit: 120,
    modes: ["tldr", "bullets", "takeaways", "social"],
    prompt: ({ input, mode, locale }) => {
      const target = {
        tldr: locale === "en" ? "a tight TL;DR" : "一个紧凑 TL;DR",
        bullets: locale === "en" ? "a bullet summary" : "一个要点列表",
        takeaways: locale === "en" ? "key takeaways" : "关键结论",
        social: locale === "en" ? "a short social-ready summary" : "一段适合社媒的短摘要",
      }[mode] || (locale === "en" ? "a tight TL;DR" : "一个紧凑 TL;DR");
      const instruction = buildJsonInstruction(
        locale,
        1200,
        2,
        3,
        120,
        locale === "en"
          ? "Prioritize factual compression. Do not invent details. For bullets or takeaways, output may use short lines or list markers."
          : "优先压缩事实信息，不要编造；如果是要点列表或关键结论，output 可以使用短行或列表符号。"
      );
      return locale === "en"
        ? `Summarize the text below into ${target}. ${instruction}\n\nTEXT:\n${input}`
        : `请把下面文本总结成${target}。${instruction}\n\n文本：\n${input}`;
    },
  },
  "prompt-optimizer": {
    outputLimit: 1800,
    noteLimit: 140,
    modes: ["coding", "writing", "analysis"],
    prompt: ({ input, mode, locale }) => {
      const target = {
        coding: locale === "en" ? "coding assistant" : "编程助手",
        writing: locale === "en" ? "writing assistant" : "写作助手",
        analysis: locale === "en" ? "analysis assistant" : "分析助手",
      }[mode] || (locale === "en" ? "coding assistant" : "编程助手");
      const instruction = buildJsonInstruction(
        locale,
        1800,
        2,
        3,
        140,
        locale === "en"
          ? "The optimized prompt must be directly usable. Clarify goal, context, constraints, output format, and quality bar. Keep it structured but not bloated."
          : "优化后的 prompt 必须可直接使用，明确目标、上下文、限制条件、输出格式和质量标准，结构清晰但不要啰嗦。"
      );
      return locale === "en"
        ? `Turn the rough intent below into a strong prompt for a ${target}. ${instruction}\n\nROUGH INTENT:\n${input}`
        : `请把下面的模糊意图优化成适合${target}使用的高质量 prompt。${instruction}\n\n原始意图：\n${input}`;
    },
  },
  "headline-rewriter": {
    outputLimit: 140,
    noteLimit: 100,
    modes: ["blog", "social", "seo"],
    prompt: ({ input, mode, locale }) => {
      const target = {
        blog: locale === "en" ? "blog title" : "博客标题",
        social: locale === "en" ? "social title" : "社媒标题",
        seo: locale === "en" ? "SEO-friendly title" : "SEO 友好标题",
      }[mode] || (locale === "en" ? "blog title" : "博客标题");
      const instruction = buildJsonInstruction(
        locale,
        140,
        4,
        6,
        100,
        locale === "en"
          ? "Make titles specific and clickable. Variants must be titles only, not explanations."
          : "标题要具体、有点击欲；variants 里只放标题，不要写解释。"
      );
      return locale === "en"
        ? `Generate better ${target} options from the source below. ${instruction}\n\nSOURCE:\n${input}`
        : `请根据下面内容生成更好的${target}。${instruction}\n\n内容：\n${input}`;
    },
  },
  "bio-generator": {
    outputLimit: 220,
    noteLimit: 100,
    modes: ["github", "social", "site"],
    prompt: ({ input, mode, locale }) => {
      const target = {
        github: locale === "en" ? "a short GitHub bio" : "一段简短 GitHub bio",
        social: locale === "en" ? "a short social profile bio" : "一段社媒简介",
        site: locale === "en" ? "a short personal-site intro" : "一段个人站介绍",
      }[mode] || (locale === "en" ? "a short GitHub bio" : "一段简短 GitHub bio");
      const instruction = buildJsonInstruction(
        locale,
        220,
        3,
        4,
        100,
        locale === "en"
          ? "Keep it crisp, natural, and paste-ready. Avoid hashtags unless clearly requested by the input."
          : "要求简短、自然、可直接粘贴；除非输入明确要求，否则不要带 hashtags。"
      );
      return locale === "en"
        ? `Write ${target} from the profile notes below. ${instruction}\n\nPROFILE NOTES:\n${input}`
        : `请根据下面信息写出${target}。${instruction}\n\n资料：\n${input}`;
    },
  },
  "meme-text": {
    outputLimit: 120,
    noteLimit: 80,
    modes: ["absurd", "dry", "dramatic"],
    prompt: ({ input, mode, locale }) => {
      const target = {
        absurd: locale === "en" ? "absurd and surreal" : "抽象离谱",
        dry: locale === "en" ? "dry and deadpan" : "冷面干巴",
        dramatic: locale === "en" ? "dramatic and over-the-top" : "戏剧化夸张",
      }[mode] || (locale === "en" ? "absurd and surreal" : "抽象离谱");
      const instruction = buildJsonInstruction(
        locale,
        120,
        4,
        6,
        80,
        locale === "en"
          ? "Keep it short, weird, and shareable. No long jokes, no paragraphs, no explanation."
          : "保持短、怪、可转发；不要写成长段，不要解释梗。"
      );
      return locale === "en"
        ? `Generate short shareable meme-like text based on the topic below. Flavor: ${target}. ${instruction}\n\nTOPIC:\n${input}`
        : `请基于下面主题生成短而可分享的梗文，风格偏${target}。${instruction}\n\n主题：\n${input}`;
    },
  },
  "social-compressor": {
    outputLimit: 320,
    noteLimit: 100,
    modes: ["oneline", "threeline", "tweet"],
    prompt: ({ input, mode, locale }) => {
      const target = {
        oneline: locale === "en" ? "a one-line post" : "一句版",
        threeline: locale === "en" ? "a three-line post" : "三句版",
        tweet: locale === "en" ? "a tweet-length post" : "tweet 长度",
      }[mode] || (locale === "en" ? "a one-line post" : "一句版");
      const instruction = buildJsonInstruction(
        locale,
        320,
        3,
        4,
        100,
        locale === "en"
          ? "Keep the meaning faithful. For oneline, output must be one sentence. For threeline, output must be exactly three short lines. For tweet, keep it concise and post-ready."
          : "保持原意不跑偏；如果是一句版，output 只能是一句话；如果是三句版，output 必须是三行短句；如果是 tweet 长度，要简洁且可直接发。"
      );
      return locale === "en"
        ? `Compress the long text below into ${target}. ${instruction}\n\nTEXT:\n${input}`
        : `请把下面长文本压缩成${target}。${instruction}\n\n原文：\n${input}`;
    },
  },
};

function parseJsonResponse(rawText: string) {
  const trimmed = String(rawText || "").trim();
  if (!trimmed) return null;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function extractAssistantText(payload: any) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part: any) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        return "";
      })
      .join("")
      .trim();
  }
  return "";
}

function normalizeResult(raw: any, config: ToolConfig, locale: Locale) {
  const output = clampText(raw?.output || "", config.outputLimit);
  const variants = uniqueNonEmpty(raw?.variants || [], 8)
    .map(item => clampText(item, config.outputLimit))
    .filter(Boolean)
    .filter(item => item !== output);
  const note = clampText(raw?.note || (locale === "en" ? "Generated successfully." : "已生成结果。"), config.noteLimit);
  return {
    output: output || variants[0] || "",
    variants: output ? variants : variants.slice(1),
    note,
  };
}

async function requestViaWorker(apiUrl: string, payload: { tool: ToolId; mode: string; input: string; locale: Locale; reroll: boolean }) {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as AiResponse;
  if (!response.ok || !data?.ok) {
    throw new Error(String(data?.error || `HTTP ${response.status}`));
  }
  return data;
}

async function requestViaDirect(payload: { tool: ToolId; mode: string; input: string; locale: Locale; reroll: boolean }) {
  const config = TOOL_CONFIG[payload.tool];
  const response = await fetch(AI_DIRECT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: AI_DIRECT_MODEL,
      stream: false,
      messages: [{ role: "user", content: config.prompt(payload) }],
    }),
  });

  const contentType = response.headers.get("content-type") || "";
  const rawPayload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    if (typeof rawPayload === "string") throw new Error(rawPayload || `HTTP ${response.status}`);
    throw new Error(String(rawPayload?.error || `HTTP ${response.status}`));
  }

  const assistantText = typeof rawPayload === "string" ? rawPayload.trim() : extractAssistantText(rawPayload);
  const parsed = parseJsonResponse(assistantText);
  if (!parsed || typeof parsed !== "object") {
    return {
      ok: true,
      output: clampText(assistantText, config.outputLimit),
      variants: [],
      note: payload.locale === "en" ? "Used direct AI fallback." : "已使用直连 AI 回退。",
      model: AI_DIRECT_MODEL,
    } as AiResponse;
  }

  const normalized = normalizeResult(parsed, config, payload.locale);
  return {
    ok: true,
    output: normalized.output,
    variants: normalized.variants,
    note: normalized.note,
    model: AI_DIRECT_MODEL,
  } as AiResponse;
}

function initAiTextTools() {
  const forms = document.querySelectorAll<HTMLElement>("[data-ai-text-tool]");
  forms.forEach(root => {
    if (root.dataset.inited === "1") return;
    root.dataset.inited = "1";

    const locale = safeLocale(root.dataset.locale);
    const t = I18N[locale];
    const tool = String(root.dataset.toolId || "").trim() as ToolId;
    const defaults = TOOL_DEFAULTS[tool];
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
    if (!input || !mode || !output || !note || !status || !submit || !reroll || !copy || !clear || !optionsWrap || !options || !TOOL_CONFIG[tool]) return;

    if (outputLabel && defaults?.[locale]?.outputLabel) {
      outputLabel.textContent = defaults[locale].outputLabel;
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

        const payload = {
          tool,
          mode: mode.value,
          input: raw,
          locale,
          reroll: isReroll,
        };

        let data: AiResponse;
        try {
          data = await requestViaWorker(apiUrl, payload);
        } catch {
          data = await requestViaDirect(payload);
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
      status.textContent = defaults?.[locale]?.status || t.remaining(maxInput);
    }
  });
}

function init() {
  initAiTextTools();
}

document.addEventListener("astro:page-load", init);
document.addEventListener("DOMContentLoaded", init, { once: true });
queueMicrotask(init);
