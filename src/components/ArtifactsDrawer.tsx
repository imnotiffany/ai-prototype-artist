import { useMemo, useState } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Search,
  Download,
  FileText,
  Image as ImageIcon,
  FileCode,
  FileSpreadsheet,
  Music,
  Video,
  File as FileIcon,
  Wand2,
  Upload,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

interface ArtifactsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 不传则使用 mock 数据 */
  artifacts?: Artifact[];
  title?: string;
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

const SourceBadge = ({ source }: { source: Artifact["source"]; toolName?: string }) => {
  const isUpload = source === "user_upload";
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] h-4 px-1.5",
        isUpload
          ? "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5"
          : "border-border text-muted-foreground bg-muted",
      )}
    >
      {isUpload ? "传入" : "产物"}
    </Badge>
  );
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
    // 搜索模式：仅命中名称的文件 / 含命中后代的文件夹
    const matchSelf = node.name.toLowerCase().includes(search.toLowerCase());
    if (node.isFolder) {
      const filteredChildren = (node.children ?? []).filter((c) => hasMatch(c, search));
      if (!matchSelf && filteredChildren.length === 0) return null;
      return (
        <>
          <div
            className="flex items-center gap-1 py-1 px-1.5 text-xs text-foreground"
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
          className="w-full flex items-center gap-1 py-1 px-1.5 text-xs hover:bg-muted/50 rounded transition-colors text-foreground"
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
        "w-full flex items-center gap-1.5 py-1 px-1.5 text-xs rounded transition-colors text-left",
        selected ? "bg-primary/10 text-foreground" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
      )}
      style={{ paddingLeft: depth * 12 + 18 }}
    >
      <IconForType type={a.type} className="w-3 h-3 shrink-0 text-foreground/50" />
      <span className="truncate flex-1">{node.name}</span>
      {isUpload && (
        <span title="用户传入" className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500/70" />
      )}
    </button>
  );
};

const hasMatch = (node: ArtifactTreeNode, q: string): boolean => {
  if (node.name.toLowerCase().includes(q.toLowerCase())) return true;
  return (node.children ?? []).some((c) => hasMatch(c, q));
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
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0 flex items-center gap-2">
          <IconForType type={a.type} className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-medium text-foreground truncate">{a.name}</div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-2">
              <span>{formatBytes(a.size)}</span>
              <span>·</span>
              <span>{a.createdAt}</span>
              <SourceBadge source={a.source} toolName={a.toolName} />
            </div>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 shrink-0"
          onClick={() => toast({ title: "已开始下载", description: a.name })}
          title="下载"
        >
          <Download className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {a.type === "image" ? (
          <div className="flex items-center justify-center">
            <img src={a.url} alt={a.name} className="max-w-full max-h-full rounded border border-border" />
          </div>
        ) : a.type === "pdf" ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
            <FileText className="w-12 h-12 opacity-30" />
            <div className="text-xs">PDF 预览需要下载后在本地查看</div>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => toast({ title: "已开始下载", description: a.name })} title="下载">
              <Download className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : a.type === "table" && a.preview ? (
          <TableCsvPreview csv={a.preview} />
        ) : a.preview ? (
          <pre className="text-[11px] font-mono leading-relaxed text-foreground whitespace-pre-wrap">{a.preview}</pre>
        ) : a.type === "audio" ? (
          <audio src={a.url} controls className="w-full" />
        ) : a.type === "video" ? (
          <video src={a.url} controls className="w-full rounded border border-border" />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
            <FileIcon className="w-12 h-12 opacity-30" />
            <div className="text-xs">该类型暂不支持预览</div>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => toast({ title: "已开始下载", description: a.name })} title="下载">
              <Download className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const TableCsvPreview = ({ csv }: { csv: string }) => {
  const rows = csv.split("\n").filter(Boolean).map((r) => r.split(","));
  if (rows.length === 0) return null;
  const [head, ...body] = rows;
  return (
    <div className="overflow-auto rounded-md border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/40">
          <tr>
            {head.map((c, i) => (
              <th key={i} className="text-left px-3 py-1.5 font-medium text-foreground/80">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i} className="border-t border-border">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-1.5 text-muted-foreground">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ProcessTimeline = ({ artifacts }: { artifacts: Artifact[] }) => {
  if (artifacts.length === 0) {
    return <div className="p-6 text-xs text-muted-foreground text-center">当前任务暂无产物</div>;
  }
  return (
    <div className="p-3 space-y-2">
      {artifacts
        .slice()
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-2 p-2 border border-border rounded-md bg-card hover:bg-muted/30 transition-colors"
          >
            <IconForType type={a.type} className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-foreground truncate">{a.name}</div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                <span>{a.createdAt}</span>
                <span>·</span>
                <span>{formatBytes(a.size)}</span>
                <SourceBadge source={a.source} toolName={a.toolName} />
              </div>
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => toast({ title: "已开始下载", description: a.name })}>
              <Download className="w-3 h-3" />
            </Button>
          </div>
        ))}
    </div>
  );
};

export const ArtifactsDrawer = ({ open, onOpenChange, artifacts, title = "文件" }: ArtifactsDrawerProps) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Artifact | null>(null);

  const data = artifacts ?? mockArtifacts;
  const tree = useMemo(() => buildArtifactTree(data), [data]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 w-full sm:max-w-[720px] flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
          <SheetTitle className="text-sm flex items-center gap-2">
            <Folder className="w-4 h-4 text-primary" />
            {title}
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {data.length}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0 flex">
          {/* 左侧：按来源分组的扁平列表 */}
          <div className="w-[260px] border-r border-border flex flex-col shrink-0">
            <div className="px-3 pt-3 pb-2 relative">
              <Search className="w-3 h-3 text-muted-foreground absolute left-5 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索文件…"
                className="h-7 text-xs pl-7 bg-muted/40 border-transparent focus-visible:border-border focus-visible:bg-background"
              />
            </div>
            <div className="flex-1 overflow-auto px-1.5 pb-2 space-y-3">
              {(() => {
                const q = search.trim().toLowerCase();
                const filtered = data.filter((a) => !q || a.name.toLowerCase().includes(q));
                const groups: { key: "user_upload" | "agent_tool"; label: string; items: Artifact[] }[] = [
                  {
                    key: "user_upload",
                    label: "传入",
                    items: filtered
                      .filter((a) => a.source === "user_upload")
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
                  },
                  {
                    key: "agent_tool",
                    label: "产物",
                    items: filtered
                      .filter((a) => a.source !== "user_upload")
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
                  },
                ];
                if (filtered.length === 0) {
                  return <div className="text-xs text-muted-foreground text-center py-6">暂无文件</div>;
                }
                return groups.map((g) =>
                  g.items.length === 0 ? null : (
                    <div key={g.key}>
                      <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <span>{g.label}</span>
                        <span className="text-muted-foreground/60">· {g.items.length}</span>
                      </div>
                      <div>
                        {g.items.map((a) => {
                          const selectedItem = selected?.path === a.path;
                          return (
                            <button
                              key={a.id}
                              onClick={() => setSelected(a)}
                              className={cn(
                                "w-full flex items-center gap-1.5 py-1 px-2 text-xs rounded transition-colors text-left",
                                selectedItem
                                  ? "bg-primary/10 text-foreground"
                                  : "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
                              )}
                            >
                              <IconForType type={a.type} className="w-3 h-3 shrink-0 text-foreground/50" />
                              <span className="truncate flex-1">{a.name}</span>
                              <span className="text-[10px] text-muted-foreground/70 shrink-0">{a.createdAt.slice(5, 10)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ),
                );
              })()}
            </div>

          </div>

          {/* 右侧：预览 */}
          <div className="flex-1 min-w-0">
            <ArtifactPreview a={selected} />
          </div>
        </div>

      </SheetContent>
    </Sheet>
  );
};
