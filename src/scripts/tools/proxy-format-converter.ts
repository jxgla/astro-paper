export {};

type Locale = "zh" | "en";
type OutputFormat = "host-port" | "host-port-user-pass" | "user-pass-host-port";

type ProxyRecord = {
  host: string;
  port: string;
  username?: string;
  password?: string;
};

const I18N = {
  zh: {
    waiting: "等待输入，内容仅在浏览器本地处理。",
    empty: "未识别到有效代理，请检查输入格式。",
    converted: (valid: number, invalidLines: number[], omitted: number) => {
      const invalid = invalidLines.length
        ? ` 未识别行：${invalidLines.join("、")}。`
        : "";
      const dropped = omitted ? ` 已省略 ${omitted} 条代理的账号密码。` : "";
      return `已识别并转换 ${valid} 条代理。${invalid}${dropped}`;
    },
    copied: "已复制全部代理。",
    copyFailed: "复制失败，请手动复制。",
  },
  en: {
    waiting: "Waiting for input. Everything stays in your browser.",
    empty: "No valid proxies detected. Check the input format.",
    converted: (valid: number, invalidLines: number[], omitted: number) => {
      const invalid = invalidLines.length
        ? ` Unrecognized lines: ${invalidLines.join(", ")}.`
        : "";
      const dropped = omitted
        ? ` Credentials omitted from ${omitted} proxies.`
        : "";
      return `${valid} proxies detected and converted.${invalid}${dropped}`;
    },
    copied: "All proxies copied.",
    copyFailed: "Copy failed. Please copy manually.",
  },
} as const;

function decodePart(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseEndpoint(
  value: string
): Pick<ProxyRecord, "host" | "port"> | null {
  const bracketed = value.match(/^(\[[^\]\s]+\]):(\d{1,5})$/);
  const regular = value.match(/^([^:\s/@?#]+):(\d{1,5})$/);
  const match = bracketed || regular;
  if (!match) return null;

  const port = Number(match[2]);
  if (port < 1 || port > 65535) return null;
  return { host: match[1], port: match[2] };
}

export function parseProxyLine(rawLine: string): ProxyRecord | null {
  const line = rawLine.trim();
  if (!line) return null;

  const withoutScheme = line.replace(/^[a-z][a-z\d+.-]*:\/\//i, "");
  if (withoutScheme.includes("@")) {
    const separator = withoutScheme.lastIndexOf("@");
    const credentials = withoutScheme.slice(0, separator);
    const endpoint = parseEndpoint(withoutScheme.slice(separator + 1));
    const credentialSeparator = credentials.indexOf(":");
    if (
      !endpoint ||
      credentialSeparator < 1 ||
      credentialSeparator === credentials.length - 1
    )
      return null;
    return {
      ...endpoint,
      username: decodePart(credentials.slice(0, credentialSeparator)),
      password: decodePart(credentials.slice(credentialSeparator + 1)),
    };
  }

  const endpoint = parseEndpoint(withoutScheme);
  if (endpoint) return endpoint;

  const colonAuth = withoutScheme.match(
    /^(\[[^\]\s]+\]|[^:\s/@?#]+):(\d{1,5}):([^:\s]+):(.+)$/
  );
  if (!colonAuth) return null;
  const port = Number(colonAuth[2]);
  if (port < 1 || port > 65535) return null;
  return {
    host: colonAuth[1],
    port: colonAuth[2],
    username: decodePart(colonAuth[3]),
    password: decodePart(colonAuth[4]),
  };
}

export function formatProxy(
  proxy: ProxyRecord,
  format: OutputFormat,
  prefix: string
) {
  const endpoint = `${proxy.host}:${proxy.port}`;
  const hasCredentials =
    proxy.username !== undefined && proxy.password !== undefined;
  const username = hasCredentials
    ? encodeURIComponent(proxy.username as string)
    : "";
  const password = hasCredentials
    ? encodeURIComponent(proxy.password as string)
    : "";

  let body = endpoint;
  if (hasCredentials && format === "host-port-user-pass")
    body = `${endpoint}:${username}:${password}`;
  if (hasCredentials && format === "user-pass-host-port")
    body = `${username}:${password}@${endpoint}`;
  return prefix ? `${prefix}://${body}` : body;
}

function initProxyConverters() {
  document
    .querySelectorAll<HTMLElement>("[data-proxy-converter]")
    .forEach(root => {
      if (root.dataset.inited === "1") return;
      root.dataset.inited = "1";

      const locale: Locale = root.dataset.locale === "en" ? "en" : "zh";
      const t = I18N[locale];
      const input =
        root.querySelector<HTMLTextAreaElement>("[data-proxy-input]");
      const output = root.querySelector<HTMLTextAreaElement>(
        "[data-proxy-output]"
      );
      const format = root.querySelector<HTMLSelectElement>(
        "[data-proxy-format]"
      );
      const prefix = root.querySelector<HTMLSelectElement>(
        "[data-proxy-prefix]"
      );
      const status = root.querySelector<HTMLElement>("[data-proxy-status]");
      const copy = root.querySelector<HTMLButtonElement>("[data-proxy-copy]");
      const clear = root.querySelector<HTMLButtonElement>("[data-proxy-clear]");
      if (!input || !output || !format || !prefix || !status || !copy || !clear)
        return;

      const convert = () => {
        const lines = input.value.split(/\r?\n/);
        const proxies: ProxyRecord[] = [];
        const invalidLines: number[] = [];

        lines.forEach((line, index) => {
          if (!line.trim()) return;
          const parsed = parseProxyLine(line);
          if (parsed) proxies.push(parsed);
          else invalidLines.push(index + 1);
        });

        output.value = proxies
          .map(proxy =>
            formatProxy(proxy, format.value as OutputFormat, prefix.value)
          )
          .join("\n");
        copy.disabled = proxies.length === 0;

        if (!input.value.trim()) status.textContent = t.waiting;
        else if (!proxies.length)
          status.textContent =
            t.empty +
            (invalidLines.length ? ` ${invalidLines.join(", ")}` : "");
        else {
          const omitted =
            format.value === "host-port"
              ? proxies.filter(proxy => proxy.username !== undefined).length
              : 0;
          status.textContent = t.converted(
            proxies.length,
            invalidLines,
            omitted
          );
        }
      };

      input.addEventListener("input", convert);
      format.addEventListener("change", convert);
      prefix.addEventListener("change", convert);
      clear.addEventListener("click", () => {
        input.value = "";
        output.value = "";
        convert();
        input.focus();
      });
      copy.addEventListener("click", async () => {
        if (!output.value) return;
        try {
          await navigator.clipboard.writeText(output.value);
          status.textContent = t.copied;
        } catch {
          output.focus();
          output.select();
          status.textContent = t.copyFailed;
        }
      });

      convert();
    });
}

document.addEventListener("astro:page-load", initProxyConverters);
document.addEventListener("DOMContentLoaded", initProxyConverters, {
  once: true,
});
queueMicrotask(initProxyConverters);
