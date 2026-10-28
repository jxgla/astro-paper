import { decodeSecret, generateTotp } from "./totp";

const I18N = {
  zh: {
    waiting: "等待输入密钥",
    hint: "仅在本地计算，不上传、不保存密钥。支持标准 6 位 / 30 秒 TOTP。",
    invalid: "密钥格式不正确，请粘贴绑定时的 Base32 密钥，而非 6 位验证码。",
    unavailable: "当前浏览器无法计算验证码，请使用 HTTPS 或本机地址访问。",
    failed: "验证码生成失败，请重新输入密钥。",
    copied: "验证码已复制。",
    copyFailed: "复制失败，请选中验证码手动复制。",
    remaining: (seconds: number) => `${seconds} 秒后刷新 · 请确保设备时间准确`,
  },
  en: {
    waiting: "Waiting for a secret",
    hint: "Calculated locally. Secrets are never uploaded or saved. Standard 6-digit / 30-second TOTP.",
    invalid:
      "Invalid secret. Paste the Base32 setup secret, not a 6-digit code.",
    unavailable:
      "Code generation is unavailable. Use HTTPS or a localhost address.",
    failed: "Could not generate a code. Please enter the secret again.",
    copied: "Code copied.",
    copyFailed: "Copy failed. Select the code and copy it manually.",
    remaining: (seconds: number) =>
      `Refreshes in ${seconds}s · Keep your device clock accurate`,
  },
};

function initTwofaViewers() {
  document
    .querySelectorAll<HTMLElement>("[data-twofa-viewer]")
    .forEach(root => {
      if (root.dataset.inited === "1") return;
      root.dataset.inited = "1";
      const t = I18N[root.dataset.locale === "en" ? "en" : "zh"];
      const input = root.querySelector<HTMLInputElement>("[data-twofa-secret]");
      const output = root.querySelector<HTMLInputElement>("[data-twofa-code]");
      const countdown = root.querySelector<HTMLElement>(
        "[data-twofa-countdown]"
      );
      const status = root.querySelector<HTMLElement>("[data-twofa-status]");
      const copy = root.querySelector<HTMLButtonElement>("[data-twofa-copy]");
      const clear = root.querySelector<HTMLButtonElement>("[data-twofa-clear]");
      if (!input || !output || !countdown || !status || !copy || !clear) return;

      let key: CryptoKey | null = null;
      let revision = 0;
      let renderedStep = -1;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const reset = () => {
        clearTimeout(timer);
        revision++;
        key = null;
        renderedStep = -1;
        output.value = "------";
        countdown.textContent = t.waiting;
        copy.disabled = true;
      };

      const refresh = async () => {
        if (!key) return;
        const activeKey = key;
        const activeRevision = revision;
        const now = Date.now();
        const step = Math.floor(now / 30000);
        if (renderedStep !== step) {
          output.value = "------";
          copy.disabled = true;
          try {
            const code = await generateTotp(activeKey, now);
            if (activeRevision !== revision) return;
            // A calculation crossing the boundary must not display an expired code.
            if (Math.floor(Date.now() / 30000) !== step) return;
            output.value = code;
            renderedStep = step;
            copy.disabled = false;
          } catch {
            if (activeRevision !== revision) return;
            reset();
            status.textContent = t.failed;
            return;
          }
        }
        countdown.textContent = t.remaining(
          30 - (Math.floor(Date.now() / 1000) % 30)
        );
      };

      const tick = async () => {
        const activeRevision = revision;
        await refresh();
        if (key && activeRevision === revision) timer = setTimeout(tick, 250);
      };

      input.addEventListener("input", async () => {
        reset();
        status.textContent = t.hint;
        if (!input.value.trim()) return;
        if (!globalThis.crypto?.subtle) {
          status.textContent = t.unavailable;
          return;
        }
        let secret: Uint8Array<ArrayBuffer>;
        try {
          secret = decodeSecret(input.value);
        } catch {
          status.textContent = t.invalid;
          return;
        }
        const activeRevision = revision;
        try {
          const imported = await crypto.subtle.importKey(
            "raw",
            secret,
            { name: "HMAC", hash: "SHA-1" },
            false,
            ["sign"]
          );
          if (activeRevision !== revision) return;
          key = imported;
          void tick();
        } catch {
          if (activeRevision === revision) status.textContent = t.failed;
        }
      });

      copy.addEventListener("click", async () => {
        const activeRevision = revision;
        await refresh();
        if (activeRevision !== revision || copy.disabled) return;
        try {
          await navigator.clipboard.writeText(output.value);
          if (activeRevision === revision) status.textContent = t.copied;
        } catch {
          if (activeRevision !== revision) return;
          output.focus();
          output.select();
          status.textContent = t.copyFailed;
        }
      });
      clear.addEventListener("click", () => {
        reset();
        input.value = "";
        status.textContent = t.hint;
        input.focus();
      });
      document.addEventListener(
        "astro:before-swap",
        () => {
          reset();
          input.value = "";
        },
        { once: true }
      );
    });
}

document.addEventListener("astro:page-load", initTwofaViewers);
document.addEventListener("DOMContentLoaded", initTwofaViewers, { once: true });
queueMicrotask(initTwofaViewers);
