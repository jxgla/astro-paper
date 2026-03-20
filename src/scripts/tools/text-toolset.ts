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

function init() {
  initTextProcessor();
  initTextRedactor();
}

document.addEventListener("astro:page-load", init);
document.addEventListener("DOMContentLoaded", init, { once: true });
queueMicrotask(init);
