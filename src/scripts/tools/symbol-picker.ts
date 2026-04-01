import { SYMBOL_PICKER_CATEGORIES, SYMBOL_PICKER_SOURCE } from "@/data/symbol-picker";

export {};

type Locale = "en" | "zh";

const LABELS = {
  en: {
    searchPlaceholder: "Search a symbol, category, or emoji name",
    empty: "No matching symbols yet. Try a simpler keyword.",
    copyFail: "Copy failed. Please copy manually.",
  },
  zh: {
    searchPlaceholder: "搜索符号、分类，或 emoji 名称",
    empty: "没有匹配结果，换个关键词试试。",
    copyFail: "复制失败，请手动复制。",
  },
} as const;

function safeLocale(raw: unknown): Locale {
  return raw === "zh" ? "zh" : "en";
}

function esc(v: unknown) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalize(v: string) {
  return v.normalize("NFKC").toLowerCase().trim();
}

function getStatusText(locale: Locale, symbolCount: number, categoryCount: number, query: string) {
  if (locale === "zh") {
    return query
      ? `匹配到 ${categoryCount} 个分类，${symbolCount} 个符号。点一下即可复制。`
      : `当前收录 ${categoryCount} 个分类，${symbolCount} 个符号。点一下即可复制。`;
  }
  return query
    ? `Matched ${symbolCount} symbols in ${categoryCount} categories. Click any tile to copy.`
    : `Showing ${symbolCount} symbols across ${categoryCount} categories. Click any tile to copy.`;
}

function getCopiedText(locale: Locale, symbol: string, label: string) {
  return locale === "zh" ? `已复制 ${symbol} · ${label}` : `Copied ${symbol} · ${label}`;
}

function getSourceHtml(locale: Locale) {
  const prefix = locale === "zh" ? "来源参考：" : "Source reference:";
  return `${prefix} <a href="${esc(SYMBOL_PICKER_SOURCE.href)}" target="_blank" rel="noreferrer">${esc(SYMBOL_PICKER_SOURCE.label)}</a> · ${esc(SYMBOL_PICKER_SOURCE.note[locale])}`;
}

function matches(query: string, locale: Locale, category: (typeof SYMBOL_PICKER_CATEGORIES)[number], item: (typeof SYMBOL_PICKER_CATEGORIES)[number]["items"][number]) {
  if (!query) return true;
  const haystack = normalize(
    [
      category.title.en,
      category.title.zh,
      category.hint.en,
      category.hint.zh,
      item.symbol,
      item.label.en,
      item.label.zh,
      locale,
    ].join(" "),
  );
  const tokens = query.split(/\s+/).filter(Boolean);
  return tokens.every(token => haystack.includes(token));
}

function renderGroups(locale: Locale, rawQuery: string) {
  const query = normalize(rawQuery);
  const groups = SYMBOL_PICKER_CATEGORIES.map(category => ({
    ...category,
    items: category.items.filter(item => matches(query, locale, category, item)),
  })).filter(category => category.items.length > 0);

  const symbolCount = groups.reduce((sum, category) => sum + category.items.length, 0);

  return {
    html: groups.length
      ? groups
          .map(
            category => `
              <section class="symbol-picker-group">
                <div class="symbol-picker-group-head">
                  <div class="symbol-picker-group-title">
                    <span class="symbol-picker-group-icon">${esc(category.icon)}</span>
                    <strong>${esc(category.title[locale])}</strong>
                  </div>
                  <span class="tool-badge">${category.items.length}</span>
                </div>
                <p class="symbol-picker-group-hint">${esc(category.hint[locale])}</p>
                <div class="symbol-picker-grid">
                  ${category.items
                    .map(
                      item => `
                        <button
                          type="button"
                          class="symbol-picker-tile"
                          data-symbol-picker-copy="${esc(item.symbol)}"
                          data-symbol-picker-label="${esc(item.label[locale])}"
                          aria-label="${esc(locale === "zh" ? `复制 ${item.symbol} ${item.label[locale]}` : `Copy ${item.symbol} ${item.label[locale]}`)}"
                          title="${esc(locale === "zh" ? `复制 ${item.symbol}` : `Copy ${item.symbol}`)}"
                        >
                          <span class="symbol-picker-char">${esc(item.symbol)}</span>
                          <span class="symbol-picker-name">${esc(item.label[locale])}</span>
                        </button>
                      `,
                    )
                    .join("")}
                </div>
              </section>
            `,
          )
          .join("")
      : `<div class="tool-result">${esc(LABELS[locale].empty)}</div>`,
    symbolCount,
    categoryCount: groups.length,
  };
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

function initSymbolPicker() {
  const roots = Array.from(document.querySelectorAll("[data-symbol-picker]"));
  for (const root of roots) {
    if (!(root instanceof HTMLElement)) continue;
    if (root.dataset.inited === "1") continue;
    root.dataset.inited = "1";

    const locale = safeLocale(root.dataset.locale);
    const labels = LABELS[locale];

    const search = root.querySelector("[data-symbol-picker-search]");
    const status = root.querySelector("[data-symbol-picker-status]");
    const source = root.querySelector("[data-symbol-picker-source]");
    const groups = root.querySelector("[data-symbol-picker-groups]");

    if (!(search instanceof HTMLInputElement)) continue;
    if (!(status instanceof HTMLElement)) continue;
    if (!(source instanceof HTMLElement)) continue;
    if (!(groups instanceof HTMLElement)) continue;

    search.placeholder = labels.searchPlaceholder;
    source.innerHTML = getSourceHtml(locale);

    const render = () => {
      const { html, symbolCount, categoryCount } = renderGroups(locale, search.value || "");
      groups.innerHTML = html;
      status.textContent = getStatusText(locale, symbolCount, categoryCount, search.value || "");
    };

    render();

    search.addEventListener("input", render);

    root.addEventListener("click", async event => {
      const target = event.target instanceof Element ? event.target.closest("[data-symbol-picker-copy]") : null;
      if (!(target instanceof HTMLButtonElement)) return;

      const symbol = target.dataset.symbolPickerCopy || "";
      const label = target.dataset.symbolPickerLabel || symbol;
      if (!symbol) return;

      try {
        await copyText(symbol);
        status.textContent = getCopiedText(locale, symbol, label);
        const active = root.querySelector(".symbol-picker-tile.is-copied");
        if (active instanceof HTMLElement) active.classList.remove("is-copied");
        target.classList.add("is-copied");
        window.setTimeout(() => target.classList.remove("is-copied"), 1200);
      } catch {
        status.textContent = labels.copyFail;
      }
    });
  }
}

function boot() {
  initSymbolPicker();
}

document.addEventListener("astro:page-load", boot);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  queueMicrotask(boot);
}
