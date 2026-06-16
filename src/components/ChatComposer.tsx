import { useEffect, useMemo, useRef, useState } from "react";
import { Paperclip, Mic, Send, Square, Check, X, ExternalLink, FileText, Image as ImageIcon, FileCode, FileSpreadsheet, Music, Video, File as FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AttachmentChip, type PendingAttachment } from "@/components/AttachmentBubble";
import { guessTypeFromName, type Artifact, type ArtifactType } from "@/data/artifacts";

export interface ChatComposerPayload {
  text: string;
  attachments: PendingAttachment[];
}

interface ChatComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSend: (payload: ChatComposerPayload) => void;
  placeholder?: string;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  enableVoice?: boolean;
  enableAttachment?: boolean;
  accept?: string;
  maxFiles?: number;
  /** bytes */
  maxSize?: number;
  /** 右下角发送按钮左侧自定义内容 */
  extraSlot?: React.ReactNode;
  /** 紧凑模式（适配 RunDualView 底部嵌入） */
  compact?: boolean;
  /** 用户点击"在文件中查看"链接的回调；不传则不显示该链接 */
  onOpenFiles?: () => void;
  /** 可被 @ 引用的会话内文件列表（含传入 / 产物） */
  mentionableFiles?: Artifact[];
}

const DEFAULT_ACCEPT = [
  // 图片
  "image/*",
  // 文档
  ".pdf", ".doc", ".docx", ".txt", ".md",
  // 表格
  ".xls", ".xlsx", ".csv",
  // 演示
  ".ppt", ".pptx",
  // 数据 / 配置
  ".json", ".xml", ".yaml", ".yml", ".log",
  // 压缩包
  ".zip",
  // 音视频
  "audio/*", "video/mp4", "video/webm", "video/quicktime",
].join(",");

let uid = 0;
const genId = () => `att-${++uid}-${Date.now()}`;

const FileTypeIcon = ({ type, className }: { type: ArtifactType; className?: string }) => {
  const map: Record<ArtifactType, JSX.Element> = {
    image: <ImageIcon className={className} />,
    doc: <FileText className={className} />,
    pdf: <FileText className={className} />,
    table: <FileSpreadsheet className={className} />,
    code: <FileCode className={className} />,
    audio: <Music className={className} />,
    video: <Video className={className} />,
    file: <FileIcon className={className} />,
  };
  return map[type] ?? <FileIcon className={className} />;
};

export const ChatComposer = ({
  value,
  onChange,
  onSend,
  placeholder = "请输入你的需求，按「Enter」发送",
  disabled = false,
  isStreaming = false,
  onStop,
  enableVoice = true,
  enableAttachment = true,
  accept = DEFAULT_ACCEPT,
  maxFiles = 10,
  maxSize = 20 * 1024 * 1024,
  extraSlot,
  compact = false,
  onOpenFiles,
  mentionableFiles = [],
}: ChatComposerProps) => {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  /** 刚上传的轻提示（3s 自动淡出） */
  const [justUploaded, setJustUploaded] = useState<PendingAttachment[]>([]);
  /** @ 提及状态 */
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const justUploadedTimerRef = useRef<number | null>(null);

  /* 录音计时 */
  useEffect(() => {
    if (recording) {
      setRecordSec(0);
      recordTimerRef.current = window.setInterval(() => setRecordSec((s) => s + 1), 1000);
      return () => {
        if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
      };
    }
  }, [recording]);

  /* 刚上传提示 3s 自动消失 */
  const showJustUploaded = (items: PendingAttachment[]) => {
    setJustUploaded(items);
    if (justUploadedTimerRef.current) window.clearTimeout(justUploadedTimerRef.current);
    justUploadedTimerRef.current = window.setTimeout(() => setJustUploaded([]), 3000);
  };

  const dismissJustUploaded = (id?: string) => {
    if (justUploadedTimerRef.current) window.clearTimeout(justUploadedTimerRef.current);
    if (!id) {
      setJustUploaded([]);
      return;
    }
    setJustUploaded((prev) => prev.filter((x) => x.id !== id));
  };

  const undoJustUploaded = (id: string) => {
    setAttachments((prev) => prev.filter((x) => x.id !== id));
    dismissJustUploaded(id);
  };

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (attachments.length + list.length > maxFiles) {
      toast({
        title: "附件超限",
        description: `单次最多上传 ${maxFiles} 个文件`,
        variant: "destructive",
      });
      return;
    }
    const fresh: PendingAttachment[] = [];
    for (const f of list) {
      if (f.size > maxSize) {
        toast({
          title: `${f.name} 超出大小限制`,
          description: `单文件 ≤ ${Math.round(maxSize / 1024 / 1024)}MB`,
          variant: "destructive",
        });
        continue;
      }
      const type = guessTypeFromName(f.name);
      const att: PendingAttachment = {
        id: genId(),
        name: f.name,
        size: f.size,
        type,
        mime: f.type || "application/octet-stream",
        progress: 0,
      };
      if (type === "image") {
        const reader = new FileReader();
        reader.onload = () => {
          att.url = String(reader.result);
          setAttachments((prev) => prev.map((a) => (a.id === att.id ? { ...att } : a)));
        };
        reader.readAsDataURL(f);
      }
      fresh.push(att);
    }
    setAttachments((prev) => [...prev, ...fresh]);
    if (fresh.length > 0) showJustUploaded(fresh);
    // mock 上传进度
    fresh.forEach((att) => {
      const tick = window.setInterval(() => {
        setAttachments((prev) => {
          const i = prev.findIndex((a) => a.id === att.id);
          if (i === -1) {
            window.clearInterval(tick);
            return prev;
          }
          const next = [...prev];
          const np = Math.min(100, next[i].progress + 15 + Math.random() * 20);
          next[i] = { ...next[i], progress: np };
          if (np >= 100) window.clearInterval(tick);
          return next;
        });
      }, 200);
    });
  };

  const handleSend = () => {
    if (disabled || isStreaming) return;
    const text = value.trim();
    if (!text && attachments.length === 0) return;
    if (attachments.some((a) => a.progress < 100)) {
      toast({ title: "附件还在上传…", description: "请稍候再发送" });
      return;
    }
    onSend({ text, attachments });
    setAttachments([]);
    dismissJustUploaded();
  };

  const startVoice = () => {
    if (disabled || isStreaming) return;
    setRecording(true);
  };
  const cancelVoice = () => setRecording(false);
  const finishVoice = () => {
    setRecording(false);
    setTranscribing(true);
    setTimeout(() => {
      onChange((value ? value + " " : "") + "（语音转写）这里是识别后的文本");
      setTranscribing(false);
      taRef.current?.focus();
    }, 1500);
  };

  const formatSec = (s: number) => {
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${m}:${sec}`;
  };

  /* ── @ 提及检测 ── */
  const detectMention = (text: string, caret: number) => {
    // 向前回溯到最近的 @ 或空白
    const before = text.slice(0, caret);
    const at = before.lastIndexOf("@");
    if (at === -1) return null;
    // @ 前必须是行首或空白
    if (at > 0 && !/\s/.test(before[at - 1])) return null;
    const q = before.slice(at + 1);
    // 含空白则视为结束
    if (/\s/.test(q)) return null;
    return { at, query: q };
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    onChange(v);
    if (mentionableFiles.length === 0) return;
    const m = detectMention(v, e.target.selectionStart ?? v.length);
    setMentionQuery(m ? m.query : null);
    setMentionIndex(0);
  };

  const filteredMentions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return mentionableFiles.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 6);
  }, [mentionQuery, mentionableFiles]);

  const insertMention = (a: Artifact) => {
    const ta = taRef.current;
    if (!ta) return;
    const caret = ta.selectionStart ?? value.length;
    const m = detectMention(value, caret);
    if (!m) return;
    const before = value.slice(0, m.at);
    const after = value.slice(caret);
    const inserted = `@${a.name} `;
    const next = before + inserted + after;
    onChange(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const pos = (before + inserted).length;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // @ 提及下拉键盘控制
    if (mentionQuery !== null && filteredMentions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % filteredMentions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + filteredMentions.length) % filteredMentions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMentions[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      onDragOver={(e) => {
        if (!enableAttachment) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!enableAttachment) return;
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
      }}
      className={cn(
        "relative rounded-lg border border-border bg-card transition-colors",
        dragOver && "ring-2 ring-primary/40 border-primary/40",
        compact ? "p-2" : "p-2.5",
      )}
    >
      {/* 刚上传轻提示 chip（3s 自动淡出） */}
      {justUploaded.length > 0 && (
        <div className="mb-2 space-y-1">
          {justUploaded.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 px-2 py-1 rounded-md bg-blue-500/5 border border-blue-500/20 text-[11px] animate-in fade-in slide-in-from-top-1 duration-200"
            >
              <FileTypeIcon type={a.type} className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-foreground truncate min-w-0 flex-1">
                <span className="text-muted-foreground">刚上传：</span>
                {a.name}
              </span>
              {onOpenFiles && (
                <button
                  onClick={() => {
                    onOpenFiles();
                    dismissJustUploaded(a.id);
                  }}
                  className="shrink-0 inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  在文件中查看
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              )}
              <button
                onClick={() => undoJustUploaded(a.id)}
                className="shrink-0 text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-muted"
                title="撤销"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 已上传文件直接进入「文件」侧栏 + 顶部 chip 轻提示，输入区不再重复展示附件气泡 */}

      {/* 录音条 */}
      {recording && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-md bg-destructive/10 border border-destructive/30">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-[11px] font-mono text-destructive tabular-nums">{formatSec(recordSec)}</span>
          <div className="flex-1 flex items-center gap-0.5 h-4">
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className="w-0.5 bg-destructive/70 rounded-full"
                style={{
                  height: `${30 + Math.abs(Math.sin((Date.now() / 200 + i) * 0.8)) * 70}%`,
                  animation: "pulse 1s ease-in-out infinite",
                  animationDelay: `${i * 60}ms`,
                }}
              />
            ))}
          </div>
          <button onClick={cancelVoice} className="text-muted-foreground hover:text-foreground p-1" aria-label="取消">
            <X className="w-3.5 h-3.5" />
          </button>
          <button onClick={finishVoice} className="text-primary hover:text-primary/80 p-1" aria-label="完成">
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {transcribing && (
        <div className="text-[10px] text-muted-foreground mb-1.5 px-1 animate-pulse">语音识别中…</div>
      )}

      {/* Textarea */}
      <textarea
        ref={taRef}
        value={value}
        onChange={handleTextareaChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setMentionQuery(null), 150)}
        placeholder={isStreaming ? "智能体正在处理…" : placeholder}
        disabled={disabled || isStreaming || recording}
        rows={compact ? 2 : 3}
        className={cn(
          "w-full resize-none bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground/60",
          compact ? "py-1 px-1" : "py-1.5 px-1",
        )}
      />

      {/* @ 提及下拉 */}
      {mentionQuery !== null && filteredMentions.length > 0 && (
        <div className="absolute left-2 right-2 bottom-12 z-20 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
          <div className="px-2 py-1 text-[10px] text-muted-foreground border-b border-border bg-muted/30">
            选择文件引用（↑↓ 切换，Enter 选中，Esc 取消）
          </div>
          <div className="max-h-48 overflow-auto">
            {filteredMentions.map((f, i) => {
              const isUpload = f.source === "user_upload";
              return (
                <button
                  key={f.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(f);
                  }}
                  onMouseEnter={() => setMentionIndex(i)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-left",
                    i === mentionIndex ? "bg-primary/10" : "hover:bg-muted/50",
                  )}
                >
                  <FileTypeIcon type={f.type} className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1 text-foreground">{f.name}</span>
                  <span
                    className={cn(
                      "shrink-0 inline-flex items-center px-1 h-3.5 rounded-sm text-[9px] font-medium",
                      isUpload
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isUpload ? "传入" : "产物"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1">
          {enableAttachment && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isStreaming}
                title="添加附件"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          {enableVoice && !recording && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={startVoice}
              disabled={disabled || isStreaming}
              title="语音输入"
            >
              <Mic className="w-3.5 h-3.5" />
            </Button>
          )}
          {extraSlot}
        </div>

        {isStreaming && onStop ? (
          <Button size="icon" variant="destructive" className="h-7 w-7" onClick={onStop} title="停止">
            <Square className="w-3.5 h-3.5" />
          </Button>
        ) : (
          <Button
            size="icon"
            className="h-7 w-7"
            onClick={handleSend}
            disabled={disabled || isStreaming || (!value.trim() && attachments.length === 0)}
            title="发送 (Enter)"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};
