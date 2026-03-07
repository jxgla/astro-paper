import { createPandocInstance } from "pandoc-wasm/src/core.js";
import pandocWasmUrl from "pandoc-wasm/src/pandoc.wasm?url";

let cachedInstancePromise: Promise<{
  convert: (options: { from: string; to: string }, input: string, extra?: Record<string, unknown>) => Promise<{ stdout: string; stderr?: string }>;
}> | null = null;

async function createInstance() {
  const response = await fetch(pandocWasmUrl);
  if (!response.ok) {
    throw new Error(`Failed to load pandoc.wasm: HTTP ${response.status}`);
  }
  const wasmBinary = await response.arrayBuffer();
  return createPandocInstance(wasmBinary);
}

export async function getPandocBrowserInstance() {
  if (!cachedInstancePromise) {
    cachedInstancePromise = createInstance();
  }
  return cachedInstancePromise;
}