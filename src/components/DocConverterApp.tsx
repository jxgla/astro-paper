import { useMemo, useState } from "react";

type Format = "txt" | "md" | "html" | "tex" | "docx";
type SourceMode = "text" | "file";
type ApiResponse = { ok: boolean; result?: string; error?: string };

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
const API_BASE = (import.meta.env.PUBLIC_DOC_CONVERTER_API_BASE || "https://converter.410666.xyz").replace(/\/$/, "");

async function runTextConversion(inputType: Format, outputType: Format, content: string) {
  const response = await fetch(`${API_BASE}/api/convert/text`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ inputType, outputType, content }),
  });

  const payload = (await response.json()) as ApiResponse;
  if (!response.ok || !payload.ok || typeof payload.result !== "string") {
    throw new Error(payload.error || "转换服务暂时不可用。");
  }

  return payload.result;
}

async function runFileConversion(inputType: Format, outputType: Format, file: File) {
  const formData = new FormData();
  formData.append("inputType", inputType);
  formData.append("outputType", outputType);
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/api/convert/file`, {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as ApiResponse;
  if (!response.ok || !payload.ok || typeof payload.result !== "string") {
    throw new Error(payload.error || "文件转换失败。");
  }

  return payload.result;
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
  const [downloaded, setDownloaded] = useState(false);

  const availableOutputFormats = useMemo<Format[]>(() => OUTPUT_FORMATS_BY_INPUT[inputType as Format] || [], [inputType]);

  const handleSourceModeChange = (nextMode: SourceMode) => {
    setSourceMode(nextMode);
    setResult("");
    setError("");
    setCopied(false);
    setDownloaded(false);
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
    setCopied(false);
    setDownloaded(false);
  };

  const handleConvert = async () => {
    setIsBusy(true);
    setError("");
    setCopied(false);
    setDownloaded(false);
    try {
      if (sourceMode === "file") {
        if (!selectedFile) throw new Error("请先选择 .docx 文件。");
        if (selectedFile.size > DOCX_MAX_BYTES) throw new Error("docx 文件过大，当前限制为 10MB。");
        const nextResult = await runFileConversion(inputType, outputType, selectedFile);
        setResult(nextResult);
        return;
      }
      if (!textInput.trim()) throw new Error("请先输入要转换的内容。");
      const nextResult = await runTextConversion(inputType, outputType, textInput);
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
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1600);
  };

  return (
    <div className="doc-converter-app">
      <div className="doc-converter-intro">
        <div>
          <span className="doc-converter-badge">Experimental</span>
          <h2>文档格式转换</h2>
          <p>当前改为独立后端服务驱动，站点只保留轻前端，避免浏览器端 wasm 包体过大导致发布失败。</p>
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

      <div className="doc-top-alerts">
        <div className="doc-alert-card">
          <strong>适合现在使用的场景</strong>
          <p>轻量 Markdown、简单 LaTeX、常规 HTML，以及没有复杂样式的大部分 docx。</p>
        </div>
        <div className="doc-alert-card">
          <strong>服务端转换说明</strong>
          <p>请求会发送到 `converter.410666.xyz` 后端服务处理。复杂表格、脚注、富样式 Word 排版仍不保证完全保真。</p>
        </div>
      </div>

      <div className="doc-converter-grid">
        <section className="doc-panel">
          <div className="doc-panel-head">
            <div>
              <h3>输入配置</h3>
              <p>先选择来源和格式，再决定输出目标。</p>
            </div>
          </div>

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
              <small>{selectedFile ? `已选择：${selectedFile.name}` : "限制 10MB。文件将通过 tunnel 转到后端服务处理，不直接暴露 VPS 端口。"}</small>
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
          {downloaded ? <div className="doc-success">结果已下载。</div> : null}
        </section>

        <section className="doc-panel">
          <div className="doc-output-head">
            <h3>结果展示</h3>
            <span>{outputType.toUpperCase()}</span>
          </div>
          <pre className="doc-output">{result || "暂无结果"}</pre>
        </section>
      </div>

      <style>{`
        .doc-converter-app {
          display: grid;
          gap: 1rem;
        }

        .doc-converter-intro {
          display: grid;
          gap: 0.9rem;
          grid-template-columns: 1.4fr 1fr;
        }

        .doc-converter-badge {
          display: inline-block;
          margin-bottom: 0.5rem;
          border-radius: 999px;
          padding: 0.18rem 0.55rem;
          font-size: 0.72rem;
          font-weight: 700;
          background: color-mix(in oklab, var(--accent) 18%, transparent);
          color: var(--accent);
        }

        .doc-converter-intro h2,
        .doc-panel-head h3,
        .doc-output-head h3 {
          margin: 0;
        }

        .doc-converter-intro p,
        .doc-panel-head p,
        .doc-alert-card p {
          margin: 0.35rem 0 0;
          line-height: 1.6;
          color: color-mix(in oklab, var(--foreground) 82%, transparent);
        }

        .doc-converter-note,
        .doc-alert-card,
        .doc-panel {
          border: 1px solid color-mix(in oklab, var(--foreground) 14%, transparent);
          border-radius: 1rem;
          background: color-mix(in oklab, var(--background) 97%, transparent);
          padding: 1rem;
        }

        .doc-converter-note ul {
          margin: 0.55rem 0 0;
          padding-left: 1rem;
          line-height: 1.7;
        }

        .doc-top-alerts {
          display: grid;
          gap: 0.8rem;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .doc-alert-card strong {
          display: block;
          font-size: 0.9rem;
        }

        .doc-converter-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
        }

        .doc-panel {
          display: grid;
          gap: 0.9rem;
        }

        .doc-panel-head,
        .doc-output-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .doc-output-head span {
          border-radius: 999px;
          padding: 0.2rem 0.55rem;
          font-size: 0.72rem;
          font-weight: 700;
          background: color-mix(in oklab, var(--foreground) 9%, transparent);
        }

        .doc-form-grid {
          display: grid;
          gap: 0.8rem;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .doc-form-grid label,
        .doc-textarea-wrap,
        .doc-file-wrap {
          display: grid;
          gap: 0.35rem;
          font-size: 0.82rem;
          font-weight: 600;
        }

        .doc-form-grid span,
        .doc-textarea-wrap span,
        .doc-file-wrap span {
          color: color-mix(in oklab, var(--foreground) 78%, transparent);
        }

        .doc-form-grid select,
        .doc-textarea-wrap textarea,
        .doc-file-wrap input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid color-mix(in oklab, var(--foreground) 15%, transparent);
          background: color-mix(in oklab, var(--background) 99%, transparent);
          color: var(--foreground);
          padding: 0.7rem 0.78rem;
          font-size: 0.86rem;
        }

        .doc-textarea-wrap textarea {
          min-height: 18rem;
          resize: vertical;
          line-height: 1.55;
          font-family: var(--font-inter), "SFMono-Regular", Consolas, monospace;
        }

        .doc-file-wrap small {
          color: color-mix(in oklab, var(--foreground) 68%, transparent);
          line-height: 1.5;
          font-weight: 400;
        }

        .doc-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
        }

        .doc-primary,
        .doc-secondary {
          border-radius: 0.75rem;
          padding: 0.68rem 0.95rem;
          font-size: 0.84rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }

        .doc-primary:disabled,
        .doc-secondary:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .doc-primary {
          border: 1px solid transparent;
          color: #fff;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
        }

        .doc-secondary {
          border: 1px solid color-mix(in oklab, var(--foreground) 15%, transparent);
          color: var(--foreground);
          background: color-mix(in oklab, var(--background) 95%, transparent);
        }

        .doc-error,
        .doc-success {
          border-radius: 0.75rem;
          padding: 0.72rem 0.82rem;
          font-size: 0.82rem;
          line-height: 1.55;
        }

        .doc-error {
          border: 1px solid color-mix(in oklab, #ef4444 35%, transparent);
          background: color-mix(in oklab, #ef4444 10%, var(--background) 90%);
          color: #b91c1c;
        }

        .doc-success {
          border: 1px solid color-mix(in oklab, #10b981 35%, transparent);
          background: color-mix(in oklab, #10b981 12%, var(--background) 88%);
          color: #047857;
        }

        .doc-output {
          margin: 0;
          min-height: 32rem;
          max-height: 60vh;
          overflow: auto;
          border-radius: 0.85rem;
          border: 1px solid color-mix(in oklab, var(--foreground) 13%, transparent);
          background: color-mix(in oklab, #0f172a 84%, var(--background) 16%);
          color: #e2e8f0;
          padding: 0.9rem;
          white-space: pre-wrap;
          line-height: 1.55;
          font-size: 0.8rem;
        }

        @media (max-width: 960px) {
          .doc-converter-intro,
          .doc-top-alerts,
          .doc-converter-grid,
          .doc-form-grid {
            grid-template-columns: 1fr;
          }

          .doc-output {
            min-height: 18rem;
          }
        }
      `}</style>
    </div>
  );
}
