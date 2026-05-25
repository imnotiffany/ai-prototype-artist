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
  const [activeDir, setActiveDir] = useState<string | null>(null);


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

  // ─ 收起态：右上角矩形按钮 ─
  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className={cn(
          "absolute right-3 top-3 z-20",
          "h-8 px-2.5 flex items-center gap-1.5",
          "rounded-md border border-border bg-card shadow-sm hover:shadow-md hover:bg-accent transition-all",
        )}
        title="展开产物面板"
      >
        <FolderOpen className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] font-medium text-foreground">{title}</span>
        <Badge variant="secondary" className="text-[9px] h-4 px-1 min-w-4 justify-center">
          {count}
        </Badge>
      </button>
    );
  }

  // 默认选中第一个目录
  const currentDir = activeDir ?? grouped[0]?.[0] ?? null;
  const currentFiles = grouped.find(([d]) => d === currentDir)?.[1] ?? [];

  // ─ 展开态：浮窗（与四周保留间距，不与边缘贴合）─
  return (
    <div
      className={cn(
        "h-full w-[420px] shrink-0 p-3 pl-2",
        "flex flex-col",
        className,
      )}
    >
      <div
        className={cn(
          "flex-1 min-h-0 flex flex-col overflow-hidden",
          "rounded-xl border border-border bg-card shadow-lg",
          "animate-in slide-in-from-right-4 fade-in duration-200",
        )}
      >
        {/* 头部 */}
        <div className="h-10 px-2.5 flex items-center gap-1.5 border-b border-border shrink-0">
          {selected ? (
            <button
              onClick={() => setSelected(null)}
              className="p-1 -ml-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="返回"
            >
              <ArrowLeft className="w-3 h-3" />
            </button>
          ) : (
            <FolderOpen className="w-3.5 h-3.5 text-primary" />
          )}
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            <span className="text-[12px] font-medium truncate">
              {selected ? selected.name : title}
            </span>
            {!selected && (
              <Badge variant="secondary" className="text-[9px] h-3.5 px-1">
                {count}
              </Badge>
            )}
          </div>
          {selected && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => toast({ title: "已开始下载", description: selected.name })}
              title="下载"
            >
              <Download className="w-3 h-3" />
            </Button>
          )}
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="收起"
          >
            <Minus className="w-3 h-3" />
          </button>
        </div>

        {/* 主体 */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {selected ? (
            <ArtifactPreview a={selected} />
          ) : (
            <div className="h-full flex">
              {/* 左：文件夹列表 */}
              <div className="w-[120px] shrink-0 border-r border-border overflow-auto py-1.5">
                {grouped.map(([dir, items]) => {
                  const active = dir === currentDir;
                  // 仅展示目录最后一段作为标签，整路径在 title 中
                  const label = dir === "根目录" ? dir : dir.split("/").pop() ?? dir;
                  return (
                    <button
                      key={dir}
                      onClick={() => setActiveDir(dir)}
                      title={dir}
                      className={cn(
                        "w-full flex items-center gap-1.5 px-2 py-1 text-left transition-colors",
                        "border-l-2",
                        active
                          ? "border-primary bg-muted/60 text-foreground"
                          : "border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                      )}
                    >
                      <Folder
                        className={cn(
                          "w-3 h-3 shrink-0",
                          active ? "text-amber-500" : "text-amber-500/70",
                        )}
                      />
                      <span className="text-[11px] truncate flex-1">{label}</span>
                      <span className="text-[9px] tabular-nums opacity-60">
                        {items.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 右：当前文件夹下的文件 */}
              <div className="flex-1 min-w-0 overflow-auto py-1.5 px-1.5 space-y-0.5">
                {currentFiles.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelected(a)}
                    className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded border border-transparent hover:border-border hover:bg-muted/40 transition-colors text-left"
                  >
                    <IconForType type={a.type} className="w-3 h-3 text-foreground/60 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-foreground truncate leading-tight">
                        {a.name}
                      </div>
                      <div className="text-[9px] text-muted-foreground flex items-center gap-1 leading-tight mt-0.5">
                        <span>{formatBytes(a.size)}</span>
                        <span>·</span>
                        <span className="truncate">{a.createdAt}</span>
                      </div>
                    </div>
                  </button>
                ))}
                {currentFiles.length === 0 && (
                  <div className="text-[10px] text-muted-foreground px-2 py-4 text-center">
                    暂无文件
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
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
