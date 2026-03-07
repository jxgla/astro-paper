import { useMemo, useState } from "react";
type Format = "txt" | "md" | "html" | "tex" | "docx";
type SourceMode = "text" | "file";
type WorkerResponse = { ok: boolean; result?: string; error?: string };

const TEXT_FORMATS: Format[] = ["md", "html", "tex"];
const FILE_FORMATS: Format[] = ["docx"];
const OUTPUT_FORMATS_BY_INPUT: Record<Format, Format[]> = {
  txt: [],
  md: ["tex", "html"],
  html: ["md"],
  tex: ["md"],
  docx: ["html", "md"],
};

const DOCX_MAX_BYTES = 10 * 1024 * 1024;
const HTML_MAX_BYTES = 2 * 1024 * 1024;

function createConverterWorker() {
  const source = `
    self.onmessage = async (event) => {
      const { inputType, outputType, payload } = event.data;
      try {
        const mod = await import("pandoc-wasm");
        const mammoth = await import("mammoth");
        const normalizeInputFormat = (format) => format === "md" ? "markdown" : format === "tex" ? "latex" : format;
        const normalizeOutputFormat = (format) => format === "md" ? "gfm" : format === "tex" ? "latex" : format;
        const runPandoc = async (inputType, outputType, payload) => {
          const result = await mod.convert({ from: normalizeInputFormat(inputType), to: normalizeOutputFormat(outputType) }, payload, {});
          if (result.stderr?.trim()) throw new Error("转换引擎返回错误，请尝试更简单的输入内容。");
          return result.stdout;
        };
        const docxToHtml = async (buffer) => {
          const result = await mammoth.default.convertToHtml({ buffer: new Uint8Array(buffer) });
          const html = result.value || "";
          if (html.length > ${HTML_MAX_BYTES}) throw new Error("转换结果过大，请拆分文档后再试。");
          return html;
        };
        let result = "";
        if (inputType === "docx" && outputType === "html") {
          result = await docxToHtml(payload);
        } else if (inputType === "docx" && outputType === "md") {
          const html = await docxToHtml(payload);
          result = await runPandoc("html", "md", html);
        } else {
          result = await runPandoc(inputType, outputType, payload);
        }
        self.postMessage({ ok: true, result });
      } catch (error) {
        self.postMessage({ ok: false, error: error instanceof Error ? error.message : "Unknown worker error" });
      }
    };
  `;
  const blob = new Blob([source], { type: "text/javascript" });
  return new Worker(URL.createObjectURL(blob), { type: "module" });
}

async function runWorkerConversion(inputType: Format, outputType: Format, payload: string | ArrayBuffer) {
  const worker = createConverterWorker();
  try {
    const result = await new Promise<string>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.ok && typeof event.data.result === "string") {
          resolve(event.data.result);
          return;
        }
        reject(new Error(event.data.error || "Worker conversion failed"));
      };
      worker.onerror = () => reject(new Error("转换线程异常退出。"));
      worker.postMessage({ inputType, outputType, payload });
    });
    return result;
  } finally {
    worker.terminate();
  }
}

function guessFileName(outputType: Format) {
  return `converted.${outputType === "md" ? "md" : outputType}`;
}

export default function DocConverterApp() {
  const [sourceMode, setSourceMode] = useState<SourceMode>("text");
  const [inputType, setInputType] = useState<Format>("md");
  const [outputType, setOutputType] = useState<Format>("tex");
  const [textInput, setTextInput] = useState("# Title\n\n**Bold** and *italic*");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const availableOutputFormats = useMemo<Format[]>(() => OUTPUT_FORMATS_BY_INPUT[inputType as Format] || [], [inputType]);

  const handleSourceModeChange = (nextMode: SourceMode) => {
    setSourceMode(nextMode);
    setResult("");
    setError("");
    setCopied(false);
    if (nextMode === "text") {
      setInputType("md");
      setOutputType("tex");
      setSelectedFile(null);
      return;
    }
    setInputType("docx");
    setOutputType("html");
    setTextInput("");
  };

  const handleInputTypeChange = (nextInputType: Format) => {
    setInputType(nextInputType);
    const nextOutputs = OUTPUT_FORMATS_BY_INPUT[nextInputType];
    setOutputType(nextOutputs[0]);
    setResult("");
    setError("");
  };

  const handleConvert = async () => {
    setIsBusy(true);
    setError("");
    setCopied(false);
    try {
      if (sourceMode === "file") {
        if (!selectedFile) throw new Error("请先选择 .docx 文件。");
        if (selectedFile.size > DOCX_MAX_BYTES) throw new Error("docx 文件过大，当前限制为 10MB。");
        const payload = await selectedFile.arrayBuffer();
        const nextResult = await runWorkerConversion(inputType, outputType, payload);
        setResult(nextResult);
        return;
      }
      if (!textInput.trim()) throw new Error("请先输入要转换的内容。");
      const nextResult = await runWorkerConversion(inputType, outputType, textInput);
      setResult(nextResult);
    } catch (err) {
      setResult("");
      setError(err instanceof Error ? err.message : "转换失败");
    } finally {
      setIsBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("复制失败，请手动复制结果。");
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = guessFileName(outputType);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="doc-converter-app">
      <div className="doc-converter-intro">
        <div>
          <span className="doc-converter-badge">Experimental</span>
          <h2>文档格式转换</h2>
          <p>先做成独立子页面版本，支持 `.md`、`.tex`、`.html`、`.docx` 之间的基础转换。</p>
        </div>
        <div className="doc-converter-note">
          <strong>当前支持</strong>
          <ul>
            <li>md → tex / html</li>
            <li>tex → md</li>
            <li>html → md</li>
            <li>docx → html / md</li>
          </ul>
        </div>
      </div>

      <div className="doc-converter-grid">
        <section className="doc-panel">
          <div className="doc-form-grid">
            <label>
              <span>输入来源</span>
              <select value={sourceMode} onChange={(event) => handleSourceModeChange(event.target.value as SourceMode)}>
                <option value="text">文本粘贴</option>
                <option value="file">docx 上传</option>
              </select>
            </label>

            <label>
              <span>输入格式</span>
              <select value={inputType} onChange={(event) => handleInputTypeChange(event.target.value as Format)}>
                {(sourceMode === "text" ? TEXT_FORMATS : FILE_FORMATS).map((format: Format) => (
                  <option key={format} value={format}>{format}</option>
                ))}
              </select>
            </label>

            <label>
              <span>输出格式</span>
              <select value={outputType} onChange={(event) => setOutputType(event.target.value as Format)}>
                {availableOutputFormats.map((format: Format) => (
                  <option key={format} value={format}>{format}</option>
                ))}
              </select>
            </label>
          </div>

          {sourceMode === "text" ? (
            <label className="doc-textarea-wrap">
              <span>文本输入</span>
              <textarea rows={14} value={textInput} onChange={(event) => setTextInput(event.target.value)} placeholder="在这里粘贴 Markdown / HTML / LaTeX 文本" />
            </label>
          ) : (
            <label className="doc-file-wrap">
              <span>docx 文件</span>
              <input type="file" accept=".docx" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />
              <small>{selectedFile ? `已选择：${selectedFile.name}` : "限制 10MB，复杂格式和图片文档暂不保证完美保真。"}</small>
            </label>
          )}

          <div className="doc-actions">
            <button type="button" className="doc-primary" onClick={handleConvert} disabled={isBusy}>
              {isBusy ? "转换中…" : "开始转换"}
            </button>
            <button type="button" className="doc-secondary" onClick={handleCopy} disabled={!result}>复制结果</button>
            <button type="button" className="doc-secondary" onClick={handleDownload} disabled={!result}>下载结果</button>
          </div>

          {error ? <div className="doc-error">{error}</div> : null}
          {copied ? <div className="doc-success">结果已复制。</div> : null}
        </section>

        <section className="doc-panel">
          <div className="doc-output-head">
            <h3>结果展示</h3>
            <span>{outputType.toUpperCase()}</span>
          </div>
          <pre className="doc-output">{result || "暂无结果"}</pre>
        </section>
      </div>
    </div>
  );
}
