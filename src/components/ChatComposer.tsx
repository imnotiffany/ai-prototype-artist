import { useEffect, useRef, useState } from "react";
import { Paperclip, Mic, Send, Square, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AttachmentChip, type PendingAttachment } from "@/components/AttachmentBubble";
import { guessTypeFromName } from "@/data/artifacts";

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
}

const DEFAULT_ACCEPT = "image/*,application/pdf,.md,.txt,.docx,.xlsx,.csv,.json,.zip";

let uid = 0;
const genId = () => `att-${++uid}-${Date.now()}`;

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
}: ChatComposerProps) => {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

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
      // 图片预览
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
    // 等待所有附件上传完成
    if (attachments.some((a) => a.progress < 100)) {
      toast({ title: "附件还在上传…", description: "请稍候再发送" });
      return;
    }
    onSend({ text, attachments });
    setAttachments([]);
  };

  const startVoice = () => {
    if (disabled || isStreaming) return;
    setRecording(true);
  };

  const cancelVoice = () => {
    setRecording(false);
  };

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
        "rounded-lg border border-border bg-card transition-colors",
        dragOver && "ring-2 ring-primary/40 border-primary/40",
        compact ? "p-2" : "p-2.5",
      )}
    >
      {/* 附件气泡区 */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {attachments.map((a) => (
            <AttachmentChip
              key={a.id}
              att={a}
              onRemove={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
            />
          ))}
        </div>
      )}

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
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder={isStreaming ? "智能体正在处理…" : placeholder}
        disabled={disabled || isStreaming || recording}
        rows={compact ? 2 : 3}
        className={cn(
          "w-full resize-none bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground/60",
          compact ? "py-1 px-1" : "py-1.5 px-1",
        )}
      />

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
