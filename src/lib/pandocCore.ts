import {
  ConsoleStdout,
  File,
  OpenFile,
  PreopenDirectory,
  WASI,
} from "@bjorn3/browser_wasi_shim";

export async function createPandocInstance(wasmBinary: ArrayBuffer) {
  const args = ["pandoc.wasm", "+RTS", "-H64m", "-RTS"];
  const env: string[] = [];
  const fileSystem = new Map<string, File>();
  const fds = [
    new OpenFile(new File(new Uint8Array(), { readonly: true })),
    ConsoleStdout.lineBuffered(msg => console.log(`[WASI stdout] ${msg}`)),
    ConsoleStdout.lineBuffered(msg => console.warn(`[WASI stderr] ${msg}`)),
    new PreopenDirectory("/", fileSystem),
  ];
  const wasi = new WASI(args, env, fds, { debug: false });

  const { instance } = await WebAssembly.instantiate(wasmBinary, {
    wasi_snapshot_preview1: wasi.wasiImport as WebAssembly.ModuleImports,
  });

  wasi.initialize(instance);
  (instance.exports.__wasm_call_ctors as () => void)();

  function memoryDataView() {
    return new DataView((instance.exports.memory as WebAssembly.Memory).buffer);
  }

  const argcPtr = (instance.exports.malloc as (size: number) => number)(4);
  memoryDataView().setUint32(argcPtr, args.length, true);
  const argv = (instance.exports.malloc as (size: number) => number)(4 * (args.length + 1));
  for (let i = 0; i < args.length; i += 1) {
    const arg = (instance.exports.malloc as (size: number) => number)(args[i].length + 1);
    new TextEncoder().encodeInto(
      args[i],
      new Uint8Array((instance.exports.memory as WebAssembly.Memory).buffer, arg, args[i].length)
    );
    memoryDataView().setUint8(arg + args[i].length, 0);
    memoryDataView().setUint32(argv + 4 * i, arg, true);
  }
  memoryDataView().setUint32(argv + 4 * args.length, 0, true);
  const argvPtr = (instance.exports.malloc as (size: number) => number)(4);
  memoryDataView().setUint32(argvPtr, argv, true);
  (instance.exports.hs_init_with_rtsopts as (argcPtr: number, argvPtr: number) => void)(argcPtr, argvPtr);

  async function addFile(filename: string, data: Blob | string, readonly: boolean) {
    let uint8Array: Uint8Array;
    if (typeof data === "string") {
      uint8Array = new TextEncoder().encode(data);
    } else {
      const buffer = await data.arrayBuffer();
      uint8Array = new Uint8Array(buffer);
    }
    fileSystem.set(filename, new File(uint8Array, { readonly }));
  }

  async function convert(
    options: { from: string; to: string; [key: string]: unknown },
    stdin: string,
    files: Record<string, Blob | string> = {}
  ) {
    const optsStr = JSON.stringify(options);
    const encoded = new TextEncoder().encode(optsStr);
    const optsPtr = (instance.exports.malloc as (size: number) => number)(encoded.length);
    new TextEncoder().encodeInto(
      optsStr,
      new Uint8Array((instance.exports.memory as WebAssembly.Memory).buffer, optsPtr, encoded.length)
    );

    fileSystem.clear();
    const inFile = new File(new TextEncoder().encode(stdin || ""), { readonly: true });
    const outFile = new File(new Uint8Array(), { readonly: false });
    const errFile = new File(new Uint8Array(), { readonly: false });
    const warningsFile = new File(new Uint8Array(), { readonly: false });
    fileSystem.set("stdin", inFile);
    fileSystem.set("stdout", outFile);
    fileSystem.set("stderr", errFile);
    fileSystem.set("warnings", warningsFile);

    for (const [name, data] of Object.entries(files)) {
      await addFile(name, data, true);
    }

    (instance.exports.convert as (optsPtr: number, optsLen: number) => void)(optsPtr, encoded.length);

    return {
      stdout: new TextDecoder("utf-8", { fatal: true }).decode(outFile.data),
      stderr: new TextDecoder("utf-8", { fatal: true }).decode(errFile.data),
      warnings: new TextDecoder("utf-8", { fatal: false }).decode(warningsFile.data),
    };
  }

  return { convert };
}
