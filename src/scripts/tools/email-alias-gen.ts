type Locale = "en" | "zh";
type CharsetMode = "lower" | "alnum" | "mixed";

type Labels = {
  statusReady: string;
  statusInvalid: string;
  statusGenerated: (count: number, extras: string[]) => string;
  copied: string;
  copyFail: string;
  copiedAll: string;
  gmailHint: string;
};

export {};

const LABELS: Record<Locale, Labels> = {
  zh: {
    statusReady: "支持通用 + 别名；Gmail / Googlemail 会额外混入点号变体。纯本地生成，不联网。",
    statusInvalid: "请输入有效邮箱地址。",
    statusGenerated: (count, extras) => {
      const suffix = extras.length ? ` ${extras.join("；")}` : "";
      return `已生成 ${count} 个别名邮箱。${suffix}`.trim();
    },
    copied: "已复制。",
    copyFail: "复制失败。",
    copiedAll: "已复制全部。",
    gmailHint: "已启用 Gmail 点号规则。",
  },
  en: {
    statusReady: "Supports standard + aliases. Gmail / Googlemail also gets dot variants. Runs locally only.",
    statusInvalid: "Please enter a valid email address.",
    statusGenerated: (count, extras) => {
      const suffix = extras.length ? ` ${extras.join("; ")}` : "";
      return `Generated ${count} alias emails.${suffix}`.trim();
    },
    copied: "Copied.",
    copyFail: "Copy failed.",
    copiedAll: "Copied all.",
    gmailHint: "Gmail dot rules enabled.",
  },
};

const CHARSETS: Record<CharsetMode, string> = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  alnum: "abcdefghijklmnopqrstuvwxyz0123456789",
  mixed: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
};

function safeLocale(raw: unknown): Locale {
  return raw === "zh" ? "zh" : "en";
}

function getCryptoRandomInt(max: number) {
  if (max <= 0) return 0;
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== "function") {
    return Math.floor(Math.random() * max);
  }
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  while (true) {
    cryptoObj.getRandomValues(buf);
    const value = buf[0];
    if (value < limit) return value % max;
  }
}

function randomFromCharset(length: number, charset: string) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += charset[getCryptoRandomInt(charset.length)] || charset[0] || "a";
  }
  return out;
}

function clampNumber(raw: string, min: number, max: number, fallback: number) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeCharset(raw: string): CharsetMode {
  if (raw === "lower" || raw === "mixed") return raw;
  return "alnum";
}

function parseEmail(raw: string) {
  const input = String(raw || "").trim();
  const match = input.match(/^([^\s@]+)@([^\s@]+\.[^\s@]+)$/);
  if (!match) return null;

  const local = match[1];
  const domain = match[2].toLowerCase();
  const plusIndex = local.indexOf("+");
  const baseLocal = (plusIndex >= 0 ? local.slice(0, plusIndex) : local).trim();
  if (!baseLocal || !domain) return null;

  return {
    raw: input,
    domain,
    baseLocal,
    isGmail: domain === "gmail.com" || domain === "googlemail.com",
  };
}

function insertDotVariant(baseLocal: string) {
  const clean = baseLocal.replace(/\./g, "");
  if (clean.length < 2) return "";
  const positions: number[] = [];
  for (let i = 1; i < clean.length; i += 1) {
    positions.push(i);
  }
  if (!positions.length) return "";
  const dotCount = Math.min(Math.max(1, getCryptoRandomInt(Math.min(positions.length, 3)) + 1), positions.length);
  const chosen = new Set<number>();
  while (chosen.size < dotCount) {
    chosen.add(positions[getCryptoRandomInt(positions.length)]);
  }
  let out = "";
  for (let i = 0; i < clean.length; i += 1) {
    if (chosen.has(i)) out += ".";
    out += clean[i];
  }
  return out;
}

function makeAliasEmail(baseLocal: string, domain: string, alias: string, useDots: boolean) {
  const local = useDots ? insertDotVariant(baseLocal) || baseLocal.replace(/\./g, "") : baseLocal;
  return `${local}+${alias}@${domain}`;
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

function initEmailAliasTool() {
  const roots = Array.from(document.querySelectorAll("[data-email-alias-gen]"));
  for (const root of roots) {
    if (!(root instanceof HTMLElement)) continue;
    if (root.dataset.inited === "1") continue;
    root.dataset.inited = "1";

    const locale = safeLocale(root.dataset.locale);
    const labels = LABELS[locale];

    const input = root.querySelector("[data-email-alias-input]");
    const countInput = root.querySelector("[data-email-alias-count]");
    const lengthInput = root.querySelector("[data-email-alias-length]");
    const charsetSelect = root.querySelector("[data-email-alias-charset]");
    const generateBtn = root.querySelector("[data-email-alias-generate]");
    const moreBtn = root.querySelector("[data-email-alias-more]");
    const copyAllBtn = root.querySelector("[data-email-alias-copyall]");
    const status = root.querySelector("[data-email-alias-status]");
    const list = root.querySelector("[data-email-alias-list]");

    if (!(input instanceof HTMLInputElement)) continue;
    if (!(countInput instanceof HTMLInputElement)) continue;
    if (!(lengthInput instanceof HTMLInputElement)) continue;
    if (!(charsetSelect instanceof HTMLSelectElement)) continue;
    if (!(generateBtn instanceof HTMLButtonElement)) continue;
    if (!(moreBtn instanceof HTMLButtonElement)) continue;
    if (!(copyAllBtn instanceof HTMLButtonElement)) continue;
    if (!(status instanceof HTMLElement)) continue;
    if (!(list instanceof HTMLElement)) continue;

    status.textContent = labels.statusReady;

    let lastResults: string[] = [];

    const getToast = () => {
      let el = document.getElementById("tools-toast");
      if (el instanceof HTMLElement) return el;
      el = document.createElement("div");
      el.id = "tools-toast";
      el.className = "tools-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
      return el;
    };

    let toastTimer: number | null = null;
    const showToast = (message: string) => {
      const el = getToast();
      el.textContent = message;
      el.classList.add("is-open");
      if (toastTimer) window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        el.classList.remove("is-open");
      }, 1100);
    };

    const renderList = (emails: string[]) => {
      list.innerHTML = emails
        .map(
          (email, index) => `
            <button class="nickname-tile" type="button" data-email-alias-tile data-i="${index}" title="${email}">
              <span>${email}</span>
            </button>
          `
        )
        .join("");

      list.querySelectorAll("[data-email-alias-tile]").forEach(button => {
        button.addEventListener("click", async () => {
          const i = Number((button as HTMLElement).dataset.i || 0);
          const value = emails[i] || "";
          if (!value) return;
          try {
            await copyText(value);
            status.textContent = labels.copied;
            showToast(labels.copied);
            (button as HTMLElement).classList.add("is-copied");
            window.setTimeout(() => (button as HTMLElement).classList.remove("is-copied"), 650);
          } catch {
            status.textContent = labels.copyFail;
            showToast(labels.copyFail);
          }
        });
      });

      copyAllBtn.disabled = emails.length === 0;
    };

    const generate = () => {
      const parsed = parseEmail(input.value);
      if (!parsed) {
        lastResults = [];
        renderList([]);
        status.textContent = labels.statusInvalid;
        return;
      }

      const count = clampNumber(countInput.value, 1, 40, 12);
      const aliasLength = clampNumber(lengthInput.value, 2, 16, 6);
      const charsetMode = normalizeCharset(charsetSelect.value);
      const charset = CHARSETS[charsetMode];
      const results: string[] = [];
      const seen = new Set<string>();
      let tries = 0;

      while (results.length < count && tries < count * 30) {
        tries += 1;
        const alias = randomFromCharset(aliasLength, charset);
        const shouldUseDots = parsed.isGmail && getCryptoRandomInt(100) < 45;
        const email = makeAliasEmail(parsed.baseLocal, parsed.domain, alias, shouldUseDots);
        if (seen.has(email)) continue;
        seen.add(email);
        results.push(email);
      }

      lastResults = results;
      renderList(results);
      const extras = parsed.isGmail ? [labels.gmailHint] : [];
      status.textContent = labels.statusGenerated(results.length, extras);
    };

    generateBtn.addEventListener("click", generate);
    moreBtn.addEventListener("click", generate);

    copyAllBtn.addEventListener("click", async () => {
      if (!lastResults.length) return;
      try {
        await copyText(lastResults.join("\n"));
        status.textContent = labels.copiedAll;
        showToast(labels.copiedAll);
      } catch {
        status.textContent = labels.copyFail;
        showToast(labels.copyFail);
      }
    });
  }
}

function boot() {
  initEmailAliasTool();
}

document.addEventListener("astro:page-load", boot);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  queueMicrotask(boot);
}
