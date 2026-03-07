declare module "pandoc-wasm" {
  export function convert(
    options: { from: string; to: string },
    input: string,
    extra?: Record<string, unknown>
  ): Promise<{ stdout: string; stderr?: string }>;
}

declare module "pandoc-wasm/src/core.js" {
  export function createPandocInstance(wasmBinary: ArrayBuffer): Promise<{
    convert: (
      options: { from: string; to: string },
      input: string,
      extra?: Record<string, unknown>
    ) => Promise<{ stdout: string; stderr?: string }>;
  }>;
}

declare module "@bjorn3/browser_wasi_shim" {
  export class File {
    constructor(data: Uint8Array, options: { readonly: boolean });
    data: Uint8Array;
  }

  export class OpenFile {
    constructor(file: File);
  }

  export class PreopenDirectory {
    constructor(path: string, fileSystem: Map<string, File>);
  }

  export class WASI {
    constructor(args: string[], env: string[], fds: unknown[], options: { debug: boolean });
    wasiImport: Record<string, unknown>;
    initialize(instance: WebAssembly.Instance): void;
  }

  export const ConsoleStdout: {
    lineBuffered(handler: (msg: string) => void): unknown;
  };
}
