import { createPandocInstance } from "./pandocCore";
import pandocWasmUrl from "pandoc-wasm/src/pandoc.wasm?url";

type PandocBrowserInstance = Awaited<ReturnType<typeof createPandocInstance>>;

let cachedInstancePromise: Promise<PandocBrowserInstance> | null = null;

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