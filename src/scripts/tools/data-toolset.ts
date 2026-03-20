import yaml from "js-yaml";
import * as toml from "@iarna/toml";

export {};

type Locale = "zh" | "en";

type Messages = {
  done: string;
  copied: string;
  copyFailed: string;
  invalidInput: string;
  unsupportedJwt: string;
  invalidUrl: string;
  parseFailed: (message: string) => string;
};

const I18N: Record<Locale, Messages> = {
  zh: {
    done: "已处理完成。",
    copied: "已复制到剪贴板。",
    copyFailed: "复制失败，请手动复制。",
    invalidInput: "请输入有效内容。",
    unsupportedJwt: "请输入有效 JWT。",
    invalidUrl: "请输入有效 URL。",
    parseFailed: message => `解析失败：${message}`,
  },
  en: {
    done: "Done.",
    copied: "Copied to clipboard.",
    copyFailed: "Copy failed. Please copy manually.",
    invalidInput: "Please enter valid input.",
    unsupportedJwt: "Please enter a valid JWT.",
    invalidUrl: "Please enter a valid URL.",
    parseFailed: message => `Parse failed: ${message}`,
  },
};

function safeLocale(input: string | undefined): Locale {
  return input === "en" ? "en" : "zh";
}

function copyText(text: string, onSuccess: () => void, onError: () => void) {
  navigator.clipboard.writeText(text).then(onSuccess).catch(onError);
}

function formatDateOutputs(value: Date) {
  return {
    unixSeconds: Math.floor(value.getTime() / 1000),
    unixMilliseconds: value.getTime(),
    iso: value.toISOString(),
    local: value.toLocaleString(),
    utc: value.toUTCString(),
    shanghai: new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Shanghai" }).format(value),
    losAngeles: new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "medium", timeZone: "America/Los_Angeles" }).format(value),
  };
}

function parseDateInput(raw: string): Date | null {
  const input = raw.trim();
  if (!input) return null;
  if (/^\d{10}$/.test(input)) return new Date(Number(input) * 1000);
  if (/^\d{13}$/.test(input)) return new Date(Number(input));
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function initTimestampConverters() {
  const roots = document.querySelectorAll<HTMLElement>("[data-timestamp-tool]");
  roots.forEach(root => {
    if (root.dataset.inited === "1") return;
    root.dataset.inited = "1";

    const locale = safeLocale(root.dataset.locale);
    const t = I18N[locale];
    const input = root.querySelector<HTMLTextAreaElement>("[data-timestamp-input]");
    const output = root.querySelector<HTMLTextAreaElement>("[data-timestamp-output]");
    const status = root.querySelector<HTMLElement>("[data-timestamp-status]");
    const submit = root.querySelector<HTMLButtonElement>("[data-timestamp-convert]");
    const now = root.querySelector<HTMLButtonElement>("[data-timestamp-now]");
    const clear = root.querySelector<HTMLButtonElement>("[data-timestamp-clear]");
    const copy = root.querySelector<HTMLButtonElement>("[data-timestamp-copy]");
    if (!input || !output || !status || !submit || !now || !clear || !copy) return;

    const sync = () => {
      copy.disabled = !output.value.trim();
    };

    const convert = (raw: string) => {
      const parsed = parseDateInput(raw);
      if (!parsed) {
        status.textContent = t.invalidInput;
        return;
      }
      const result = formatDateOutputs(parsed);
      output.value = [
        `Unix (s): ${result.unixSeconds}`,
        `Unix (ms): ${result.unixMilliseconds}`,
        `ISO: ${result.iso}`,
        `Local: ${result.local}`,
        `UTC: ${result.utc}`,
        `Asia/Shanghai: ${result.shanghai}`,
        `America/Los_Angeles: ${result.losAngeles}`,
      ].join("\n");
      status.textContent = t.done;
      sync();
    };

    submit.addEventListener("click", () => convert(input.value));
    now.addEventListener("click", () => {
      input.value = String(Date.now());
      convert(input.value);
    });
    clear.addEventListener("click", () => {
      input.value = "";
      output.value = "";
      status.textContent = locale === "zh" ? "等待输入。" : "Waiting for input.";
      sync();
    });
    copy.addEventListener("click", () => {
      if (!output.value.trim()) return;
      copyText(output.value, () => (status.textContent = t.copied), () => (status.textContent = t.copyFailed));
    });

    sync();
  });
}

function toTomlString(value: unknown) {
  return toml.stringify(value as never);
}

function formatDataInput(format: string, input: string) {
  if (format === "json") {
    return JSON.stringify(JSON.parse(input), null, 2);
  }
  if (format === "yaml") {
    return yaml.dump(yaml.load(input));
  }
  if (format === "toml") {
    const parsed = toml.parse(input);
    return toTomlString(parsed);
  }
  return input;
}

function minifyDataInput(format: string, input: string) {
  if (format === "json") {
    return JSON.stringify(JSON.parse(input));
  }
  return formatDataInput(format, input);
}

function convertDataInput(inputFormat: string, outputFormat: string, input: string) {
  let parsed: unknown;
  if (inputFormat === "json") parsed = JSON.parse(input);
  else if (inputFormat === "yaml") parsed = yaml.load(input);
  else parsed = toml.parse(input);

  if (outputFormat === "json") return JSON.stringify(parsed, null, 2);
  if (outputFormat === "yaml") return yaml.dump(parsed);
  if (outputFormat === "toml") return toTomlString(parsed);
  return input;
}

function initStructuredDataToolbox() {
  const roots = document.querySelectorAll<HTMLElement>("[data-json-toolbox]");
  roots.forEach(root => {
    if (root.dataset.inited === "1") return;
    root.dataset.inited = "1";

    const locale = safeLocale(root.dataset.locale);
    const t = I18N[locale];
    const formatSelect = root.querySelector<HTMLSelectElement>("[data-json-format]");
    const convertSelect = root.querySelector<HTMLSelectElement>("[data-json-convert-target]");
    const input = root.querySelector<HTMLTextAreaElement>("[data-json-input]");
    const output = root.querySelector<HTMLTextAreaElement>("[data-json-output]");
    const status = root.querySelector<HTMLElement>("[data-json-status]");
    const formatBtn = root.querySelector<HTMLButtonElement>("[data-json-format-btn]");
    const minifyBtn = root.querySelector<HTMLButtonElement>("[data-json-minify-btn]");
    const validateBtn = root.querySelector<HTMLButtonElement>("[data-json-validate-btn]");
    const convertBtn = root.querySelector<HTMLButtonElement>("[data-json-convert-btn]");
    const copyBtn = root.querySelector<HTMLButtonElement>("[data-json-copy]");
    const clearBtn = root.querySelector<HTMLButtonElement>("[data-json-clear]");
    if (!formatSelect || !convertSelect || !input || !output || !status || !formatBtn || !minifyBtn || !validateBtn || !convertBtn || !copyBtn || !clearBtn) return;

    const sync = () => {
      copyBtn.disabled = !output.value.trim();
      minifyBtn.disabled = formatSelect.value !== "json";
    };

    const run = (fn: () => string, successText = t.done) => {
      try {
        output.value = fn();
        status.textContent = successText;
      } catch (error) {
        status.textContent = t.parseFailed(error instanceof Error ? error.message : "unknown");
      }
      sync();
    };

    formatSelect.addEventListener("change", sync);
    formatBtn.addEventListener("click", () => run(() => formatDataInput(formatSelect.value, input.value)));
    minifyBtn.addEventListener("click", () => run(() => minifyDataInput(formatSelect.value, input.value)));
    validateBtn.addEventListener("click", () => run(() => formatDataInput(formatSelect.value, input.value), locale === "zh" ? "校验通过。" : "Validation passed."));
    convertBtn.addEventListener("click", () => run(() => convertDataInput(formatSelect.value, convertSelect.value, input.value)));
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

function decodeBase64UrlUtf8(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decodeJwtPayload(token: string) {
  const parts = token.split(".");
  if (parts.length < 2) throw new Error("Invalid JWT");
  return {
    header: JSON.parse(decodeBase64UrlUtf8(parts[0])),
    payload: JSON.parse(decodeBase64UrlUtf8(parts[1])),
  };
}

function initUrlToolbox() {
  const roots = document.querySelectorAll<HTMLElement>("[data-url-toolbox]");
  roots.forEach(root => {
    if (root.dataset.inited === "1") return;
    root.dataset.inited = "1";

    const locale = safeLocale(root.dataset.locale);
    const t = I18N[locale];
    const input = root.querySelector<HTMLTextAreaElement>("[data-url-input]");
    const output = root.querySelector<HTMLTextAreaElement>("[data-url-output]");
    const status = root.querySelector<HTMLElement>("[data-url-status]");
    const actionSelect = root.querySelector<HTMLSelectElement>("[data-url-action]");
    const runBtn = root.querySelector<HTMLButtonElement>("[data-url-run]");
    const copyBtn = root.querySelector<HTMLButtonElement>("[data-url-copy]");
    const clearBtn = root.querySelector<HTMLButtonElement>("[data-url-clear]");
    if (!input || !output || !status || !actionSelect || !runBtn || !copyBtn || !clearBtn) return;

    const sync = () => {
      copyBtn.disabled = !output.value.trim();
    };

    runBtn.addEventListener("click", () => {
      const raw = input.value.trim();
      if (!raw) {
        status.textContent = t.invalidInput;
        return;
      }
      try {
        let result = "";
        switch (actionSelect.value) {
          case "encode":
            result = encodeURIComponent(raw);
            break;
          case "decode":
            result = decodeURIComponent(raw);
            break;
          case "query": {
            const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
            result = JSON.stringify(Object.fromEntries(url.searchParams.entries()), null, 2);
            break;
          }
          case "breakdown": {
            const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
            result = JSON.stringify({ protocol: url.protocol, host: url.host, pathname: url.pathname, search: url.search, hash: url.hash }, null, 2);
            break;
          }
          case "base64":
            result = atob(raw);
            break;
          case "jwt":
            result = JSON.stringify(decodeJwtPayload(raw), null, 2);
            break;
        }
        output.value = result;
        status.textContent = t.done;
      } catch (error) {
        status.textContent = t.parseFailed(error instanceof Error ? error.message : "unknown");
      }
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
  initTimestampConverters();
  initStructuredDataToolbox();
  initUrlToolbox();
}

document.addEventListener("astro:page-load", init);
document.addEventListener("DOMContentLoaded", init, { once: true });
queueMicrotask(init);
