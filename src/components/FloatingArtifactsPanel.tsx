import { useEffect, useMemo, useState } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  Minus,
  Download,
  FileText,
  Image as ImageIcon,
  FileCode,
  FileSpreadsheet,
  Music,
  Video,
  File as FileIcon,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  type Artifact,
  type ArtifactType,
  formatBytes,
  mockArtifacts,
} from "@/data/artifacts";

interface Props {
  artifacts?: Artifact[];
  title?: string;
  /** 受控收起状态 */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** 当存在产物时回调，便于外层布局调整 */
  onHasArtifactsChange?: (hasArtifacts: boolean) => void;
  className?: string;
}

const IconForType = ({ type, className }: { type: ArtifactType; className?: string }) => {
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

/**
 * 产物侧栏面板（受控）：
 * - 展开时：作为 flex 列内嵌渲染（由父布局腾出空间，不覆盖对话）
 * - 收起时：变为右侧吸边小药丸，点击可重新展开
 * - 当首次出现新产物时自动展开
 */
export const FloatingArtifactsPanel = ({
  artifacts,
  title = "产物",
  collapsed: collapsedProp,
  onCollapsedChange,
  onHasArtifactsChange,
  className,
}: Props) => {
  const data = artifacts ?? mockArtifacts;
  const count = data.length;

  const [innerCollapsed, setInnerCollapsed] = useState(false);
  const collapsed = collapsedProp ?? innerCollapsed;
  const setCollapsed = (v: boolean) => {
    onCollapsedChange?.(v);
    if (collapsedProp === undefined) setInnerCollapsed(v);
  };

  const [selected, setSelected] = useState<Artifact | null>(null);

  // 通知外层是否存在产物
  useEffect(() => {
    onHasArtifactsChange?.(count > 0);
  }, [count, onHasArtifactsChange]);

  // 新产物出现时自动展开
  const [lastCount, setLastCount] = useState(count);
  useEffect(() => {
    if (count > lastCount) setCollapsed(false);
    setLastCount(count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  // 按目录聚合
  const grouped = useMemo(() => {
    const m = new Map<string, Artifact[]>();
    data.forEach((a) => {
      const parts = a.path.split("/");
      const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "根目录";
      if (!m.has(dir)) m.set(dir, []);
      m.get(dir)!.push(a);
    });
    return Array.from(m.entries());
  }, [data]);

  if (count === 0) return null;

  // ─ 收起态：右侧吸边药丸（绝对定位，浮在对话上方但只占一点点） ─
  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 z-20",
          "flex flex-col items-center gap-1.5 px-1.5 py-3",
          "rounded-l-full rounded-r-md border border-r-0 border-border",
          "bg-card shadow-md hover:shadow-lg transition-all hover:bg-accent",
        )}
        title="展开产物面板"
      >
        <FolderOpen className="w-4 h-4 text-primary" />
        <span className="text-[10px] font-medium text-foreground writing-vertical">
          产物
        </span>
        <Badge variant="secondary" className="text-[9px] h-4 px-1 min-w-4 justify-center">
          {count}
        </Badge>
      </button>
    );
  }

  // ─ 展开态：内嵌侧栏（由父布局并排显示，不覆盖对话）─
  return (
    <div
      className={cn(
        "h-full w-[360px] shrink-0",
        "border-l border-border bg-card/95 backdrop-blur-sm",
        "flex flex-col overflow-hidden animate-in slide-in-from-right-4 fade-in duration-200",
        className,
      )}
    >
      {/* 头部 */}
      <div className="h-11 px-3 flex items-center gap-2 border-b border-border shrink-0">
        {selected ? (
          <button
            onClick={() => setSelected(null)}
            className="p-1 -ml-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="返回列表"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        ) : (
          <FolderOpen className="w-4 h-4 text-primary" />
        )}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {selected ? selected.name : title}
          </span>
          {!selected && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {count}
            </Badge>
          )}
        </div>
        {selected && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => toast({ title: "已开始下载", description: selected.name })}
            title="下载"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
        )}
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          title="收起"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 主体 */}
      <div className="flex-1 min-h-0 overflow-auto">
        {selected ? (
          <ArtifactPreview a={selected} />
        ) : (
          <div className="p-2 space-y-3">
            {grouped.map(([dir, items]) => (
              <div key={dir}>
                <div className="flex items-center gap-1.5 px-1.5 py-1 text-[11px] text-muted-foreground">
                  <Folder className="w-3 h-3 text-amber-500/80" />
                  <span className="truncate font-medium">{dir}</span>
                  <span className="ml-auto text-[10px]">{items.length}</span>
                </div>
                <div className="space-y-1">
                  {items.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setSelected(a)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md border border-transparent hover:border-border hover:bg-muted/40 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded bg-muted flex items-center justify-center shrink-0">
                        <IconForType type={a.type} className="w-3.5 h-3.5 text-foreground/70" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-foreground truncate">{a.name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                          <span>{formatBytes(a.size)}</span>
                          <span>·</span>
                          <span className="truncate">{a.createdAt}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ArtifactPreview = ({ a }: { a: Artifact }) => (
  <div className="h-full flex flex-col">
    <div className="px-3 py-2 border-b border-border text-[10px] text-muted-foreground flex items-center gap-2 shrink-0">
      <span>{formatBytes(a.size)}</span>
      <span>·</span>
      <span>{a.createdAt}</span>
      {a.toolName && (
        <>
          <span>·</span>
          <span className="truncate">{a.toolName}</span>
        </>
      )}
    </div>
    <div className="flex-1 overflow-auto p-3">
      {a.type === "image" ? (
        <img src={a.url} alt={a.name} className="max-w-full rounded border border-border" />
      ) : a.type === "audio" ? (
        <audio src={a.url} controls className="w-full" />
      ) : a.type === "video" ? (
        <video src={a.url} controls className="w-full rounded border border-border" />
      ) : a.preview ? (
        <pre className="text-[11px] font-mono leading-relaxed text-foreground whitespace-pre-wrap">
          {a.preview}
        </pre>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-3 py-10">
          <FileIcon className="w-10 h-10 opacity-30" />
          <div className="text-xs">该类型暂不支持预览</div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5"
            onClick={() => toast({ title: "已开始下载", description: a.name })}
          >
            <Download className="w-3 h-3" />
            下载查看
          </Button>
        </div>
      )}
    </div>
  </div>
);
