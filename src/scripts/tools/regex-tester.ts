export {};

type Locale = "zh" | "en";

const I18N = {
  zh: {
    done: "匹配完成。",
    invalid: (message: string) => `正则错误：${message}`,
    copied: "已复制到剪贴板。",
    copyFailed: "复制失败，请手动复制。",
  },
  en: {
    done: "Matches ready.",
    invalid: (message: string) => `Regex error: ${message}`,
    copied: "Copied to clipboard.",
    copyFailed: "Copy failed. Please copy manually.",
  },
} as const;

function safeLocale(input: string | undefined): Locale {
  return input === "en" ? "en" : "zh";
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function copyText(text: string, onSuccess: () => void, onError: () => void) {
  navigator.clipboard.writeText(text).then(onSuccess).catch(onError);
}

function initRegexTester() {
  const roots = document.querySelectorAll<HTMLElement>("[data-regex-tester]");
  roots.forEach(root => {
    if (root.dataset.inited === "1") return;
    root.dataset.inited = "1";

    const locale = safeLocale(root.dataset.locale);
    const t = I18N[locale];
    const pattern = root.querySelector<HTMLInputElement>("[data-regex-pattern]");
    const flags = root.querySelector<HTMLInputElement>("[data-regex-flags]");
    const input = root.querySelector<HTMLTextAreaElement>("[data-regex-input]");
    const output = root.querySelector<HTMLTextAreaElement>("[data-regex-output]");
    const highlight = root.querySelector<HTMLElement>("[data-regex-highlight]");
    const status = root.querySelector<HTMLElement>("[data-regex-status]");
    const runBtn = root.querySelector<HTMLButtonElement>("[data-regex-run]");
    const copyBtn = root.querySelector<HTMLButtonElement>("[data-regex-copy]");
    const clearBtn = root.querySelector<HTMLButtonElement>("[data-regex-clear]");
    if (!pattern || !flags || !input || !output || !highlight || !status || !runBtn || !copyBtn || !clearBtn) return;

    const sync = () => {
      copyBtn.disabled = !output.value.trim();
    };

    runBtn.addEventListener("click", () => {
      try {
        const regex = new RegExp(pattern.value, flags.value || "g");
        const matches = Array.from(input.value.matchAll(regex));
        output.value = matches.length
          ? matches
              .map((match, index) => `${index + 1}. ${match[0]} @ ${match.index}\nGroups: ${JSON.stringify(match.slice(1))}`)
              .join("\n\n")
          : locale === "zh"
            ? "无匹配结果。"
            : "No matches.";

        let html = escapeHtml(input.value);
        if (matches.length) {
          const unique = Array.from(new Set(matches.map(match => match[0]).filter(Boolean))).sort((a, b) => b.length - a.length);
          for (const token of unique) {
            html = html.replaceAll(escapeHtml(token), `<mark>${escapeHtml(token)}</mark>`);
          }
        }
        highlight.innerHTML = html.replaceAll("\n", "<br>");
        status.textContent = t.done;
      } catch (error) {
        output.value = "";
        highlight.innerHTML = escapeHtml(input.value).replaceAll("\n", "<br>");
        status.textContent = t.invalid(error instanceof Error ? error.message : "unknown");
      }
      sync();
    });

    copyBtn.addEventListener("click", () => {
      if (!output.value.trim()) return;
      copyText(output.value, () => (status.textContent = t.copied), () => (status.textContent = t.copyFailed));
    });
    clearBtn.addEventListener("click", () => {
      pattern.value = "";
      flags.value = "g";
      input.value = "";
      output.value = "";
      highlight.innerHTML = "";
      status.textContent = locale === "zh" ? "等待输入。" : "Waiting for input.";
      sync();
    });

    sync();
  });
}

document.addEventListener("astro:page-load", initRegexTester);
document.addEventListener("DOMContentLoaded", initRegexTester, { once: true });
queueMicrotask(initRegexTester);
