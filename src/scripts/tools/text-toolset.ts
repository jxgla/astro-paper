export {};

type Locale = "zh" | "en";

const I18N = {
  zh: {
    done: "已处理完成。",
    copied: "已复制到剪贴板。",
    copyFailed: "复制失败，请手动复制。",
  },
  en: {
    done: "Done.",
    copied: "Copied to clipboard.",
    copyFailed: "Copy failed. Please copy manually.",
  },
} as const;

function safeLocale(input: string | undefined): Locale {
  return input === "en" ? "en" : "zh";
}

function copyText(text: string, onSuccess: () => void, onError: () => void) {
  navigator.clipboard.writeText(text).then(onSuccess).catch(onError);
}

function toTitleCase(value: string) {
  return value.replace(/\w\S*/g, token => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase());
}

function initTextProcessor() {
  const roots = document.querySelectorAll<HTMLElement>("[data-text-processor]");
  roots.forEach(root => {
    if (root.dataset.inited === "1") return;
    root.dataset.inited = "1";

    const locale = safeLocale(root.dataset.locale);
    const t = I18N[locale];
    const input = root.querySelector<HTMLTextAreaElement>("[data-text-processor-input]");
    const output = root.querySelector<HTMLTextAreaElement>("[data-text-processor-output]");
    const status = root.querySelector<HTMLElement>("[data-text-processor-status]");
    const dedupe = root.querySelector<HTMLInputElement>("[data-text-dedupe]");
    const removeBlank = root.querySelector<HTMLInputElement>("[data-text-remove-blank]");
    const trimEach = root.querySelector<HTMLInputElement>("[data-text-trim]");
    const lineNumbers = root.querySelector<HTMLInputElement>("[data-text-line-numbers]");
    const prefix = root.querySelector<HTMLInputElement>("[data-text-prefix]");
    const suffix = root.querySelector<HTMLInputElement>("[data-text-suffix]");
    const find = root.querySelector<HTMLInputElement>("[data-text-find]");
    const replace = root.querySelector<HTMLInputElement>("[data-text-replace]");
    const caseMode = root.querySelector<HTMLSelectElement>("[data-text-case]");
    const runBtn = root.querySelector<HTMLButtonElement>("[data-text-run]");
    const copyBtn = root.querySelector<HTMLButtonElement>("[data-text-copy]");
    const clearBtn = root.querySelector<HTMLButtonElement>("[data-text-clear]");
    if (!input || !output || !status || !dedupe || !removeBlank || !trimEach || !lineNumbers || !prefix || !suffix || !find || !replace || !caseMode || !runBtn || !copyBtn || !clearBtn) return;

    const sync = () => {
      copyBtn.disabled = !output.value.trim();
    };

    runBtn.addEventListener("click", () => {
      let lines = input.value.split(/\r?\n/);
      if (trimEach.checked) lines = lines.map(line => line.trim());
      if (removeBlank.checked) lines = lines.filter(line => line.trim());
      if (dedupe.checked) lines = Array.from(new Set(lines));
      if (find.value) lines = lines.map(line => line.split(find.value).join(replace.value));
      lines = lines.map(line => `${prefix.value}${line}${suffix.value}`);
      lines = lines.map(line => {
        if (caseMode.value === "upper") return line.toUpperCase();
        if (caseMode.value === "lower") return line.toLowerCase();
        if (caseMode.value === "title") return toTitleCase(line);
        return line;
      });
      if (lineNumbers.checked) lines = lines.map((line, index) => `${index + 1}. ${line}`);
      output.value = lines.join("\n");
      status.textContent = t.done;
      sync();
    });

    copyBtn.addEventListener("click", () => {
      if (!output.value.trim()) return;
      copyText(output.value, () => (status.textContent = t.copied), () => (status.textContent = t.copyFailed));
    });
    clearBtn.addEventListener("click", () => {
      input.value = "";
      output.value = "";
      prefix.value = "";
      suffix.value = "";
      find.value = "";
      replace.value = "";
      caseMode.value = "none";
      dedupe.checked = false;
      removeBlank.checked = false;
      trimEach.checked = false;
      lineNumbers.checked = false;
      status.textContent = locale === "zh" ? "等待输入。" : "Waiting for input.";
      sync();
    });

    sync();
  });
}

function redactText(input: string, options: { email: boolean; phone: boolean; token: boolean; cookie: boolean; ids: boolean }) {
  let result = input;
  if (options.email) result = result.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, match => `${match.slice(0, 2)}***@***`);
  if (options.phone) result = result.replace(/\b(?:\+?\d[\d\s-]{7,}\d)\b/g, match => `${match.slice(0, 3)}****${match.slice(-2)}`);
  if (options.token) result = result.replace(/\b(?:sk|pk|rk|tok|token|bearer)[-_:\s=]*[A-Za-z0-9._-]{8,}\b/gi, token => `${token.slice(0, 6)}***`);
  if (options.cookie) result = result.replace(/\b([A-Za-z0-9_-]{2,})=([A-Za-z0-9%._-]{6,})/g, (_match, key) => `${key}=***`);
  if (options.ids) result = result.replace(/\b[A-Za-z0-9]{16,}\b/g, token => `${token.slice(0, 4)}***${token.slice(-4)}`);
  return result;
}

function initTextRedactor() {
  const roots = document.querySelectorAll<HTMLElement>("[data-text-redactor]");
  roots.forEach(root => {
    if (root.dataset.inited === "1") return;
    root.dataset.inited = "1";

    const locale = safeLocale(root.dataset.locale);
    const t = I18N[locale];
    const input = root.querySelector<HTMLTextAreaElement>("[data-redactor-input]");
    const output = root.querySelector<HTMLTextAreaElement>("[data-redactor-output]");
    const status = root.querySelector<HTMLElement>("[data-redactor-status]");
    const email = root.querySelector<HTMLInputElement>("[data-redactor-email]");
    const phone = root.querySelector<HTMLInputElement>("[data-redactor-phone]");
    const token = root.querySelector<HTMLInputElement>("[data-redactor-token]");
    const cookie = root.querySelector<HTMLInputElement>("[data-redactor-cookie]");
    const ids = root.querySelector<HTMLInputElement>("[data-redactor-ids]");
    const runBtn = root.querySelector<HTMLButtonElement>("[data-redactor-run]");
    const copyBtn = root.querySelector<HTMLButtonElement>("[data-redactor-copy]");
    const clearBtn = root.querySelector<HTMLButtonElement>("[data-redactor-clear]");
    if (!input || !output || !status || !email || !phone || !token || !cookie || !ids || !runBtn || !copyBtn || !clearBtn) return;

    const sync = () => {
      copyBtn.disabled = !output.value.trim();
    };

    runBtn.addEventListener("click", () => {
      output.value = redactText(input.value, {
        email: email.checked,
        phone: phone.checked,
        token: token.checked,
        cookie: cookie.checked,
        ids: ids.checked,
      });
      status.textContent = t.done;
      sync();
    });

    copyBtn.addEventListener("click", () => {
      if (!output.value.trim()) return;
      copyText(output.value, () => (status.textContent = t.copied), () => (status.textContent = t.copyFailed));
    });
    clearBtn.addEventListener("click", () => {
      input.value = "";
      output.value = "";
      status.textContent = locale === "zh" ? "等待输入。" : "Waiting for input.";
      sync();
    });

    sync();
  });
}

const CTF_MAX_LINES = 5000;

const CTF_I18N = {
  zh: {
    waiting: "等待输入。",
    overLimit: `输入超出 ${CTF_MAX_LINES} 行，请精简后重试。`,
    imported: (name: string, clipped: boolean) => `已导入 ${name}${clipped ? `（已截断到 ${CTF_MAX_LINES} 行）` : ""}`,
    empty: "请先输入文本。",
    noCandidate: "未检测到需要自动替换的敏感公司名。默认只自动识别白名单公司名，也可手动填写脱敏词。",
    sanitized: (count: number) => `已脱敏：${count} 个标识符。`,
    mappingMissing: "请先生成或粘贴映射。",
    mappingInvalid: "映射格式无效，请使用“原文 -> exampleN”每行一条，或导入有效 JSON。",
    reversed: "已根据映射还原。",
    outputCopied: "结果已复制到剪贴板。",
    outputDownloaded: "结果已下载。",
    inputCopied: "输入已复制到剪贴板。",
    inputDownloaded: "输入已下载。",
    inputPasted: "已粘贴到输入框。",
    outputPasted: "已粘贴到结果框。",
    pasteFailed: "读取剪贴板失败，请检查浏览器权限。",
    fileReadFailed: "读取文件失败，请重试。",
    nothingToDownload: "没有可下载内容。",
    mappingImported: (name: string) => `已导入映射 ${name}。`,
    mappingExported: "已生成映射 JSON。",
    mappingDownloaded: "映射 JSON 已下载。",
    mappingJsonEmpty: "请先生成映射或输入映射 JSON。",
    mappingApplied: "已读取映射 JSON。",
  },
  en: {
    waiting: "Waiting for input.",
    overLimit: `Input exceeds ${CTF_MAX_LINES} lines. Please shorten it.`,
    imported: (name: string, clipped: boolean) => `Imported ${name}${clipped ? ` (trimmed to ${CTF_MAX_LINES} lines)` : ""}`,
    empty: "Please enter text first.",
    noCandidate: "No sensitive company names found for auto-replace. By default only allowlisted company names are auto-detected; you can also enter custom targets.",
    sanitized: (count: number) => `Sanitized ${count} identifier(s).`,
    mappingMissing: "Please generate or paste mapping first.",
    mappingInvalid: "Invalid mapping. Use one line per entry: original -> exampleN, or import valid JSON.",
    reversed: "Restored from mapping.",
    outputCopied: "Output copied to clipboard.",
    outputDownloaded: "Output downloaded.",
    inputCopied: "Input copied to clipboard.",
    inputDownloaded: "Input downloaded.",
    inputPasted: "Pasted into input.",
    outputPasted: "Pasted into output.",
    pasteFailed: "Clipboard read failed. Please check browser permission.",
    fileReadFailed: "Failed to read file. Please retry.",
    nothingToDownload: "Nothing to download.",
    mappingImported: (name: string) => `Imported mapping ${name}.`,
    mappingExported: "Mapping JSON generated.",
    mappingDownloaded: "Mapping JSON downloaded.",
    mappingJsonEmpty: "Generate a mapping or paste mapping JSON first.",
    mappingApplied: "Mapping JSON applied.",
  },
} as const;

const HOST_IGNORE_LABELS = new Set([
  "www",
  "api",
  "cdn",
  "img",
  "static",
  "assets",
  "edge",
  "gateway",
  "proxy",
  "mail",
  "smtp",
  "imap",
  "pop",
  "ftp",
  "auth",
  "oauth",
  "sso",
  "login",
  "account",
  "admin",
  "docs",
  "blog",
  "m",
  "mobile",
  "open",
  "dev",
  "test",
  "staging",
  "stage",
  "prod",
  "beta",
  "sandbox",
  "localhost",
  "local",
  "internal",
  "lan",
  "corp",
  "office",
  "intranet",
  "com",
  "net",
  "org",
  "gov",
  "edu",
  "io",
  "app",
  "cn",
  "co",
  "cc",
  "me",
  "top",
  "xyz",
  "vip",
  "site",
  "online",
  "info",
  "dev",
  "us",
  "uk",
  "jp",
  "de",
  "fr",
  "ru",
  "in",
  "hk",
  "tw",
]);

const DEFAULT_CTF_AUTO_TARGETS = [
  "openai",
  "chatgpt",
  "anthropic",
  "claude",
  "google",
  "gemini",
  "deepmind",
  "amazon",
  "aws",
  "microsoft",
  "azure",
  "github",
  "meta",
  "facebook",
  "instagram",
  "whatsapp",
  "x",
  "twitter",
  "tesla",
  "xai",
  "grok",
  "bytedance",
  "tiktok",
  "alibaba",
  "alipay",
  "taobao",
  "tmall",
  "tencent",
  "wechat",
  "qq",
  "baidu",
  "jd",
  "douyin",
  "kuaishou",
  "meituan",
  "didi",
  "pinduoduo",
  "xiaomi",
  "huawei",
  "oppo",
  "vivo",
  "netease",
  "bilibili",
  "weibo",
  "sina",
  "yandex",
  "vk",
  "mailru",
  "naver",
  "kakao",
  "line",
  "rakuten",
  "sony",
  "nintendo",
  "softbank",
  "oracle",
  "ibm",
  "intel",
  "amd",
  "nvidia",
  "qualcomm",
  "broadcom",
  "cloudflare",
  "digitalocean",
  "vercel",
  "netlify",
  "mongodb",
  "redis",
  "snowflake",
  "salesforce",
  "slack",
  "zoom",
  "paypal",
  "stripe",
  "visa",
  "mastercard",
  "uber",
  "airbnb",
  "linkedin",
  "reddit",
  "snap",
  "spotify",
  "netflix",
  "disney",
  "apple",
];

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clipToLineLimit(value: string, limit = CTF_MAX_LINES) {
  const lines = value.split(/\r?\n/);
  if (lines.length <= limit) return { text: value, clipped: false };
  return { text: lines.slice(0, limit).join("\n"), clipped: true };
}

function extractCompanyCandidates(text: string) {
  const lowered = text.toLowerCase();
  return DEFAULT_CTF_AUTO_TARGETS.filter(token => {
    const pattern = new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(token)}(?![A-Za-z0-9])`, "i");
    return pattern.test(lowered);
  });
}

function parseManualTargets(raw: string) {
  return Array.from(
    new Set(
      raw
        .split(/\r?\n/)
        .map(line => line.trim().toLowerCase())
        .filter(line => /^[a-z][a-z0-9-]{2,}$/.test(line) && !HOST_IGNORE_LABELS.has(line))
    )
  ).sort((a, b) => a.localeCompare(b));
}

function buildMapping(candidates: string[]) {
  const mapping = new Map<string, string>();
  candidates.forEach((token, index) => {
    mapping.set(token, `example${index + 1}`);
  });
  return mapping;
}

function applyMapping(text: string, mapping: Map<string, string>) {
  let output = text;
  const entries = Array.from(mapping.entries()).sort((a, b) => b[0].length - a[0].length);
  entries.forEach(([original, replacement]) => {
    const pattern = new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(original)}(?![A-Za-z0-9])`, "gi");
    output = output.replace(pattern, replacement);
  });
  return output;
}

function mappingToJson(mapping: Map<string, string>) {
  return JSON.stringify(Object.fromEntries(mapping), null, 2);
}

function parseMappingJson(mappingJson: string) {
  try {
    const parsed = JSON.parse(mappingJson) as Record<string, unknown>;
    const mapping = new Map<string, string>();
    for (const [original, replacement] of Object.entries(parsed)) {
      if (typeof original !== "string" || typeof replacement !== "string") {
        return null;
      }
      if (!original.trim() || !/^example\d+$/i.test(replacement.trim())) {
        return null;
      }
      mapping.set(original.trim(), replacement.trim().toLowerCase());
    }
    return mapping;
  } catch {
    return null;
  }
}

function countLines(value: string) {
  if (!value) return 0;
  return value.split(/\r?\n/).length;
}

function reverseWithMapping(text: string, mapping: Map<string, string>) {
  let output = text;
  const reverseEntries = Array.from(mapping.entries())
    .map(([original, replacement]) => [replacement, original] as const)
    .sort((a, b) => b[0].length - a[0].length);

  reverseEntries.forEach(([placeholder, original]) => {
    const pattern = new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(placeholder)}(?![A-Za-z0-9])`, "gi");
    output = output.replace(pattern, original);
  });

  return output;
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function initCtfDesensitizer() {
  const roots = document.querySelectorAll<HTMLElement>("[data-ctf-desensitizer]");
  roots.forEach(root => {
    if (root.dataset.inited === "1") return;
    root.dataset.inited = "1";

    const locale = safeLocale(root.dataset.locale);
    const t = CTF_I18N[locale];
    const input = root.querySelector<HTMLTextAreaElement>("[data-ctf-input]");
    const output = root.querySelector<HTMLTextAreaElement>("[data-ctf-output]");
    const targetsBox = root.querySelector<HTMLTextAreaElement>("[data-ctf-targets]");
    const mappingJsonBox = root.querySelector<HTMLTextAreaElement>("[data-ctf-mapping-json]");
    const status = root.querySelector<HTMLElement>("[data-ctf-status]");
    const fileInput = root.querySelector<HTMLInputElement>("[data-ctf-file]");
    const mappingFileInput = root.querySelector<HTMLInputElement>("[data-ctf-mapping-file]");
    const sanitizeBtn = root.querySelector<HTMLButtonElement>("[data-ctf-sanitize]");
    const reverseBtn = root.querySelector<HTMLButtonElement>("[data-ctf-reverse]");
    const inputPasteBtn = root.querySelector<HTMLButtonElement>("[data-ctf-input-paste]");
    const outputPasteBtn = root.querySelector<HTMLButtonElement>("[data-ctf-output-paste]");
    const copyBtn = root.querySelector<HTMLButtonElement>("[data-ctf-copy]");
    const downloadBtn = root.querySelector<HTMLButtonElement>("[data-ctf-download]");
    const clearBtn = root.querySelector<HTMLButtonElement>("[data-ctf-clear]");
    const mappingExportBtn = root.querySelector<HTMLButtonElement>("[data-ctf-mapping-export]");
    const mappingApplyBtn = root.querySelector<HTMLButtonElement>("[data-ctf-mapping-apply]");
    const mappingDownloadBtn = root.querySelector<HTMLButtonElement>("[data-ctf-mapping-download]");
    const lockBtn = root.querySelector<HTMLButtonElement>("[data-ctf-lock-toggle]");

    if (
      !input ||
      !output ||
      !targetsBox ||
      !mappingJsonBox ||
      !status ||
      !fileInput ||
      !mappingFileInput ||
      !sanitizeBtn ||
      !reverseBtn ||
      !inputPasteBtn ||
      !outputPasteBtn ||
      !copyBtn ||
      !downloadBtn ||
      !clearBtn ||
      !mappingExportBtn ||
      !mappingApplyBtn ||
      !mappingDownloadBtn ||
      !lockBtn
    ) {
      return;
    }

    let lockProtected = true;

    const sync = () => {
      const hasOutput = !!output.value.trim();
      const hasMappingJson = !!mappingJsonBox.value.trim();
      copyBtn.disabled = !hasOutput;
      downloadBtn.disabled = !hasOutput;
      mappingDownloadBtn.disabled = !hasMappingJson;
      lockBtn.textContent = lockProtected ? (locale === "zh" ? "解锁" : "Unlock") : locale === "zh" ? "锁定" : "Lock";
    };

    const setMapping = (mapping: Map<string, string>) => {
      mappingJsonBox.value = mappingToJson(mapping);
      sync();
    };

    const readClipboardTo = async (target: HTMLTextAreaElement, successMessage: string) => {
      try {
        const text = await navigator.clipboard.readText();
        target.value = text;
        if (target === input) {
          const clipped = clipToLineLimit(target.value, CTF_MAX_LINES);
          if (clipped.clipped) {
            target.value = clipped.text;
            status.textContent = t.overLimit;
            sync();
            return;
          }
        }
        status.textContent = successMessage;
        sync();
      } catch {
        status.textContent = t.pasteFailed;
      }
    };

    const sanitizeFromInput = () => {
      const raw = input.value;
      if (!raw.trim()) {
        status.textContent = t.empty;
        return;
      }
      if (countLines(raw) > CTF_MAX_LINES) {
        status.textContent = t.overLimit;
        return;
      }

      const manualTargets = parseManualTargets(targetsBox.value);
      const candidates = manualTargets.length ? manualTargets : extractCompanyCandidates(raw);
      if (!candidates.length) {
        output.value = raw;
        if (!lockProtected) mappingJsonBox.value = "";
        status.textContent = t.noCandidate;
        sync();
        return;
      }

      const mapping = buildMapping(candidates);
      output.value = applyMapping(raw, mapping);
      setMapping(mapping);
      status.textContent = t.sanitized(mapping.size);
      sync();
    };

    sanitizeBtn.addEventListener("click", sanitizeFromInput);

    reverseBtn.addEventListener("click", () => {
      const mappingJson = mappingJsonBox.value.trim();
      if (!mappingJson) {
        status.textContent = t.mappingMissing;
        return;
      }

      const parsed = parseMappingJson(mappingJson);
      if (!parsed || !parsed.size) {
        status.textContent = t.mappingInvalid;
        return;
      }

      const source = output.value.trim() ? output.value : input.value;
      if (!source.trim()) {
        status.textContent = t.empty;
        return;
      }

      const restored = reverseWithMapping(source, parsed);
      input.value = restored;
      output.value = source;
      setMapping(parsed);
      status.textContent = t.reversed;
      sync();
    });

    inputPasteBtn.addEventListener("click", () => {
      void readClipboardTo(input, t.inputPasted);
    });

    outputPasteBtn.addEventListener("click", () => {
      void readClipboardTo(output, t.outputPasted);
    });

    copyBtn.addEventListener("click", () => {
      if (!output.value.trim()) return;
      copyText(output.value, () => (status.textContent = t.outputCopied), () => (status.textContent = I18N[locale].copyFailed));
    });

    downloadBtn.addEventListener("click", () => {
      if (!output.value.trim()) {
        status.textContent = t.nothingToDownload;
        return;
      }
      downloadText("ctf-desensitized.txt", output.value);
      status.textContent = t.outputDownloaded;
    });

    mappingExportBtn.addEventListener("click", () => {
      const mappingJson = mappingJsonBox.value.trim();
      if (!mappingJson) {
        status.textContent = t.mappingJsonEmpty;
        return;
      }
      const parsed = parseMappingJson(mappingJson);
      if (!parsed || !parsed.size) {
        status.textContent = t.mappingInvalid;
        return;
      }
      mappingJsonBox.value = mappingToJson(parsed);
      status.textContent = t.mappingExported;
      sync();
    });

    mappingApplyBtn.addEventListener("click", () => {
      const mappingJson = mappingJsonBox.value.trim();
      if (!mappingJson) {
        status.textContent = t.mappingJsonEmpty;
        return;
      }
      const parsed = parseMappingJson(mappingJson);
      if (!parsed || !parsed.size) {
        status.textContent = t.mappingInvalid;
        return;
      }
      mappingJsonBox.value = mappingToJson(parsed);
      status.textContent = t.mappingApplied;
      sync();
    });

    mappingDownloadBtn.addEventListener("click", () => {
      if (!mappingJsonBox.value.trim()) {
        status.textContent = t.mappingJsonEmpty;
        return;
      }
      downloadText("ctf-desensitizer-mapping.json", mappingJsonBox.value);
      status.textContent = t.mappingDownloaded;
    });

    lockBtn.addEventListener("click", () => {
      lockProtected = !lockProtected;
      sync();
    });

    clearBtn.addEventListener("click", () => {
      input.value = "";
      output.value = "";
      if (!lockProtected) {
        targetsBox.value = "";
        mappingJsonBox.value = "";
      }
      fileInput.value = "";
      mappingFileInput.value = "";
      status.textContent = t.waiting;
      sync();
    });

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const clipped = clipToLineLimit(text, CTF_MAX_LINES);
        input.value = clipped.text;
        status.textContent = t.imported(file.name, clipped.clipped);
        sync();
      } catch {
        status.textContent = t.fileReadFailed;
      }
    });

    mappingFileInput.addEventListener("change", async () => {
      const file = mappingFileInput.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = parseMappingJson(text);
        if (!parsed || !parsed.size) {
          status.textContent = t.mappingInvalid;
          return;
        }
        setMapping(parsed);
        status.textContent = t.mappingImported(file.name);
      } catch {
        status.textContent = t.fileReadFailed;
      }
    });

    input.addEventListener("input", () => {
      const clipped = clipToLineLimit(input.value, CTF_MAX_LINES);
      if (clipped.clipped) {
        input.value = clipped.text;
        status.textContent = t.overLimit;
      }
      sync();
    });

    output.addEventListener("input", sync);
    targetsBox.addEventListener("input", sync);
    mappingJsonBox.addEventListener("input", sync);

    sync();
  });
}

function init() {
  initTextProcessor();
  initTextRedactor();
  initCtfDesensitizer();
}

document.addEventListener("astro:page-load", init);
document.addEventListener("DOMContentLoaded", init, { once: true });
queueMicrotask(init);
