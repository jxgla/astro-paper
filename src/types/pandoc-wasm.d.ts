declare module "pandoc-wasm" {
  export function convert(
    options: { from: string; to: string },
    input: string,
    extra?: Record<string, unknown>
  ): Promise<{ stdout: string; stderr?: string }>;
}
