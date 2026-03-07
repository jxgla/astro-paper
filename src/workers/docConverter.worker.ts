import mammoth from "mammoth";
import { getPandocBrowserInstance } from "../lib/pandocBrowser";

type Format = "txt" | "md" | "html" | "tex" | "docx";
type ConversionPayload = string | ArrayBuffer;
type WorkerRequest = { inputType: Format; outputType: Format; payload: ConversionPayload };
type WorkerResponse = { ok: boolean; result?: string; error?: string };

const HTML_MAX_BYTES = 2 * 1024 * 1024;
const SUPPORTED_CONVERSIONS = new Set(["md:tex", "tex:md", "md:html", "html:md", "docx:html", "docx:md"]);

function normalizeInputFormat(format: Format) {
  if (format === "md") return "markdown";
  if (format === "tex") return "latex";
  return format;
}

function normalizeOutputFormat(format: Format) {
  if (format === "md") return "gfm";
  if (format === "tex") return "latex";
  return format;
}

async function runPandoc(inputType: Format, outputType: Format, payload: string) {
  const pandoc = await getPandocBrowserInstance();
  const result = await pandoc.convert({ from: normalizeInputFormat(inputType), to: normalizeOutputFormat(outputType) }, payload, {});
  if (result.stderr?.trim()) {
    throw new Error("转换引擎返回错误，请尝试更简单的输入内容。");
  }
  return result.stdout;
}

async function docxToHtml(buffer: ArrayBuffer) {
  const result = await mammoth.convertToHtml({ buffer: buffer as any });
  const html = result.value || "";
  if (html.length > HTML_MAX_BYTES) {
    throw new Error("转换结果过大，请拆分文档后再试。");
  }
  return html;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { inputType, outputType, payload } = event.data;
  const send = (resp: WorkerResponse) => self.postMessage(resp);

  try {
    if (!SUPPORTED_CONVERSIONS.has(`${inputType}:${outputType}`)) {
      throw new Error(`暂不支持 ${inputType} -> ${outputType}。`);
    }

    let result = "";
    if (inputType === "docx" && !(payload instanceof ArrayBuffer)) {
      throw new Error("docx 转换需要文件输入。");
    }
    if (inputType !== "docx" && typeof payload !== "string") {
      throw new Error("文本转换需要文本输入。");
    }

    if (inputType === "docx" && outputType === "html") {
      result = await docxToHtml(payload as ArrayBuffer);
    } else if (inputType === "docx" && outputType === "md") {
      const html = await docxToHtml(payload as ArrayBuffer);
      result = await runPandoc("html", "md", html);
    } else {
      result = await runPandoc(inputType, outputType, payload as string);
    }

    send({ ok: true, result });
  } catch (error) {
    send({ ok: false, error: error instanceof Error ? error.message : "Unknown worker error" });
  }
};
