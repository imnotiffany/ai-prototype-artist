import { useEffect, useMemo, useState } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Search,
  Minus,
  Download,
  FileText,
  Image as ImageIcon,
  FileCode,
  FileSpreadsheet,
  Music,
  Video,
  File as FileIcon,
  Upload,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  type Artifact,
  type ArtifactTreeNode,
  type ArtifactType,
  buildArtifactTree,
  formatBytes,
  mockArtifacts,
} from "@/data/artifacts";

interface Props {
  artifacts?: Artifact[];
  /** 面板标题，默认"文件" */
  title?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
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

const hasMatch = (node: ArtifactTreeNode, q: string): boolean => {
  if (node.name.toLowerCase().includes(q.toLowerCase())) return true;
  return (node.children ?? []).some((c) => hasMatch(c, q));
};

const TreeNode = ({
  node,
  depth,
  selectedPath,
  onSelect,
  search,
}: {
  node: ArtifactTreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (a: Artifact) => void;
  search: string;
}) => {
  const [open, setOpen] = useState(true);

  if (search) {
    const matchSelf = node.name.toLowerCase().includes(search.toLowerCase());
    if (node.isFolder) {
      const filteredChildren = (node.children ?? []).filter((c) => hasMatch(c, search));
      if (!matchSelf && filteredChildren.length === 0) return null;
      return (
        <>
          <div
            className="flex items-center gap-1 py-1 px-1.5 text-[11px] text-foreground"
            style={{ paddingLeft: depth * 12 + 6 }}
          >
            <FolderOpen className="w-3 h-3 text-amber-500/80" />
            <span className="truncate">{node.name}</span>
          </div>
          {filteredChildren.map((c) => (
            <TreeNode key={c.path} node={c} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} search={search} />
          ))}
        </>
      );
    }
    if (!matchSelf) return null;
  }

  if (node.isFolder) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-1 py-1 px-1.5 text-[11px] hover:bg-muted/50 rounded transition-colors text-foreground"
          style={{ paddingLeft: depth * 12 + 6 }}
        >
          {open ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
          {open ? (
            <FolderOpen className="w-3 h-3 shrink-0 text-amber-500/80" />
          ) : (
            <Folder className="w-3 h-3 shrink-0 text-amber-500/80" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {open &&
          node.children?.map((c) => (
            <TreeNode key={c.path} node={c} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} search={search} />
          ))}
      </div>
    );
  }

  const a = node.artifact!;
  const selected = selectedPath === a.path;
  const isUpload = a.source === "user_upload";
  return (
    <button
      onClick={() => onSelect(a)}
      className={cn(
        "w-full flex items-center gap-1.5 py-1 px-1.5 text-[11px] rounded transition-colors text-left",
        selected ? "bg-primary/10 text-foreground" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
      )}
      style={{ paddingLeft: depth * 12 + 18 }}
    >
      <IconForType type={a.type} className="w-3 h-3 shrink-0 text-foreground/50" />
      <span className="truncate flex-1">{node.name}</span>
      <span
        className={cn(
          "shrink-0 inline-flex items-center gap-0.5 px-1 h-3.5 rounded-sm text-[9px] font-medium",
          isUpload
            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        )}
        title={isUpload ? "用户传入" : "AI 产出"}
      >
        {isUpload ? <Upload className="w-2 h-2" /> : <Sparkles className="w-2 h-2" />}
        {isUpload ? "传入" : "产物"}
      </span>
    </button>
  );
};

/**
 * 文件面板（受控）：左侧目录树 + 右侧预览。
 * - 跟随会话存在；收起后变成右上角"文件"按钮。
 */
export const FloatingArtifactsPanel = ({
  artifacts,
  title = "文件",
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
  const [search, setSearch] = useState("");
  const tree = useMemo(() => buildArtifactTree(data), [data]);

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

  if (count === 0) return null;

  // ─ 收起态：右上角"文件"按钮 ─
  if (collapsed) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setCollapsed(false)}
        className="absolute right-3 top-1.5 z-20 h-7 text-xs gap-1.5 pr-1.5 shadow-sm hover:shadow bg-background"
        title="展开文件"
      >
        <FolderOpen className="w-3.5 h-3.5 text-primary" />
        <span>{title}</span>
        <span className="ml-0.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-sm bg-muted text-[10px] font-medium tabular-nums text-muted-foreground">
          {count}
        </span>
      </Button>
    );
  }

  // ─ 展开态：树 + 预览，与抽屉版样式一致 ─
  return (
    <div className={cn("h-full w-[560px] shrink-0 p-3 pl-2 flex flex-col", className)}>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg animate-in slide-in-from-right-4 fade-in duration-200">
        {/* 头部 */}
        <div className="h-10 px-3 flex items-center gap-2 border-b border-border shrink-0">
          <FolderOpen className="w-3.5 h-3.5 text-primary" />
          <span className="text-[12px] font-medium flex-1">{title}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            title="打包下载全部"
            onClick={() => toast({ title: "开始打包下载", description: `共 ${count} 个文件` })}
          >
            <Download className="w-3 h-3" />
          </Button>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="收起"
          >
            <Minus className="w-3 h-3" />
          </button>
        </div>

        {/* 主体：左树 + 右预览 */}
        <div className="flex-1 min-h-0 flex">
          {/* 左：树 + 搜索 */}
          <div className="w-[220px] shrink-0 border-r border-border flex flex-col bg-muted/10">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索文件…"
                  className="h-7 text-xs pl-7"
                />
              </div>
            </div>
            <div className="flex-1 overflow-auto p-1">
              {tree.length === 0 ? (
                <div className="text-[11px] text-muted-foreground text-center py-6">暂无文件</div>
              ) : (
                tree.map((n) => (
                  <TreeNode
                    key={n.path}
                    node={n}
                    depth={0}
                    selectedPath={selected?.path ?? null}
                    onSelect={setSelected}
                    search={search}
                  />
                ))
              )}
            </div>
          </div>

          {/* 右：预览 */}
          <div className="flex-1 min-w-0">
            <ArtifactPreview a={selected} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ArtifactPreview = ({ a }: { a: Artifact | null }) => {
  if (!a) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
        选择要查看的文件
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-border text-[10px] text-muted-foreground flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0 flex items-center gap-2">
          <IconForType type={a.type} className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-[11px] font-medium text-foreground truncate">{a.name}</span>
          <span>·</span>
          <span>{formatBytes(a.size)}</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 shrink-0"
          onClick={() => toast({ title: "已开始下载", description: a.name })}
          title="下载"
        >
          <Download className="w-3 h-3" />
        </Button>
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
};
