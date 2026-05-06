import { useState, ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, ExternalLink, Plus, KeyRound } from "lucide-react";

export interface PickerItem {
  name: string;
  description: string;
  /** MCP 专用：服务商分组，"lh" 领慧 / "dd" 钉钉 */
  provider?: "lh" | "dd";
  /** MCP 专用：是否需要凭据 */
  requiresCredential?: boolean;
}

interface Props {
  items: PickerItem[];
  selected: string[];
  onToggle: (name: string) => void;
  icon: ReactNode;
  /** Display label, e.g. "MCP" or "Skill" */
  label: string;
  marketLink: string;
  deployBadge?: (name: string) => string;
  /** Override the trigger element (defaults to a small "+" icon button) */
  trigger?: ReactNode;
}

export const CapabilityPickerDialog = ({
  items,
  selected,
  onToggle,
  icon,
  label,
  marketLink,
  deployBadge,
  trigger,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = items.filter(
    (it) =>
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      it.description.toLowerCase().includes(search.toLowerCase()),
  );

  const marketName = label === "Skill" ? "Skill 广场" : label === "MCP" ? "MCP 广场" : "智能体广场";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="icon" className="h-7 w-7" title={`添加 ${label}`}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            选择 {label}
            <Badge variant="secondary" className="text-[10px] font-normal">已选 {selected.length}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input
            className="h-8 text-xs"
            placeholder={`搜索 ${label} 名称或功能描述`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1 shrink-0"
            onClick={() => window.open(marketLink, "_blank")}
          >
            前往{marketName}
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
        <div className="overflow-auto -mx-1 px-1 grid grid-cols-2 gap-2.5">
          {filtered.map((it) => {
            const sel = selected.includes(it.name);
            return (
              <div
                key={it.name}
                className={`border rounded-lg p-3 transition-colors ${
                  sel
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40 bg-card"
                }`}
              >
                <div className="flex items-start gap-2 mb-1.5">
                  <div
                    className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
                      sel ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{it.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {deployBadge && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5">{deployBadge(it.name)}</Badge>
                      )}
                    </div>
                  </div>
                  {sel && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-2.5 min-h-[32px]">
                  {it.description}
                </p>
                <div className="flex items-center justify-between">
                  <button
                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                    onClick={() => window.open(`${marketLink}#${encodeURIComponent(it.name)}`, "_blank")}
                  >
                    查看详情 <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                  <Button
                    size="sm"
                    variant={sel ? "outline" : "default"}
                    className="h-6 text-[10px] px-2"
                    onClick={() => onToggle(it.name)}
                  >
                    {sel ? "移除" : "添加"}
                  </Button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-2 text-center text-xs text-muted-foreground py-8">未找到匹配的 {label}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>
            完成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
