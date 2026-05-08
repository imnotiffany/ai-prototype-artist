import { useMemo, useState, ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, ExternalLink, Plus, KeyRound, Upload } from "lucide-react";

export interface PickerItem {
  name: string;
  description: string;
  /** MCP 专用：服务商分组，"lh" 领慧 / "dd" 钉钉（仅用于历史兼容，UI 不再展示分组） */
  provider?: "lh" | "dd";
  /** MCP 专用：是否需要凭据 */
  requiresCredential?: boolean;
  /** Skill 专用：来源范围 — market=Skill 广场公共，project=项目自建 */
  scope?: "market" | "project";
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
  trigger,
}: Props) => {
  const isMcp = label === "MCP";
  const isSkill = label === "Skill";
  const hasSkillScopes = isSkill && items.some((i) => i.scope);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [skillScope, setSkillScope] = useState<"market" | "project">("market");
  // Snapshot selected order at dialog open so newly toggled items "float to top"
  // without items reshuffling on every click.
  const [orderSnapshot, setOrderSnapshot] = useState<string[]>([]);

  const handleOpenChange = (o: boolean) => {
    if (o) setOrderSnapshot(selected);
    setOpen(o);
  };

  const filtered = items.filter((it) => {
    if (hasSkillScopes && (it.scope ?? "market") !== skillScope) return false;
    const q = search.toLowerCase();
    return it.name.toLowerCase().includes(q) || it.description.toLowerCase().includes(q);
  });

  const sorted = useMemo(() => {
    if (!isMcp) return filtered;
    const newlyOn = filtered.filter((it) => selected.includes(it.name) && !orderSnapshot.includes(it.name));
    const wasOn = filtered.filter((it) => orderSnapshot.includes(it.name));
    const rest = filtered.filter((it) => !selected.includes(it.name) && !orderSnapshot.includes(it.name));
    return [...newlyOn, ...wasOn, ...rest];
  }, [filtered, selected, orderSnapshot, isMcp]);

  const marketCount = items.filter((i) => (i.scope ?? "market") === "market").length;
  const projectCount = items.filter((i) => i.scope === "project").length;
  const marketLabel = isMcp ? "前往 MCP 广场" : `前往${isSkill ? "Skill 广场" : "智能体广场"}`;
  const skillUploadUrl = "https://ai.sf-express.com/project/enter/skill-app/skills/project";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
        {hasSkillScopes && (
          <Tabs value={skillScope} onValueChange={(v) => setSkillScope(v as "market" | "project")}>
            <TabsList className="h-8">
              <TabsTrigger value="market" className="text-xs h-6 px-3">市场 Skill <span className="ml-1 text-muted-foreground">({marketCount})</span></TabsTrigger>
              <TabsTrigger value="project" className="text-xs h-6 px-3">项目 Skill <span className="ml-1 text-muted-foreground">({projectCount})</span></TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        <div className="flex items-center gap-2">
          <Input
            className="h-8 text-xs"
            placeholder={`搜索 ${label} 名称或功能描述`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {hasSkillScopes && skillScope === "project" ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs shrink-0 gap-1"
              onClick={() => window.open(skillUploadUrl, "_blank")}
              title="跳转到项目 Skill 页面上传安装包"
            >
              <Upload className="w-3 h-3" />
              上传 Skill 安装包
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs shrink-0"
              onClick={() => window.open(marketLink, "_blank")}
            >
              {marketLabel}
            </Button>
          )}
        </div>
        {hasSkillScopes && skillScope === "project" && (
          <p className="text-[10px] text-muted-foreground -mt-1">
            项目 Skill 仅当前项目可见。如需上传新的 Skill 安装包，请前往「项目 Skill」页面。
          </p>
        )}
        <div className="overflow-auto -mx-1 px-1 grid grid-cols-2 gap-2.5">
          {sorted.map((it) => {
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
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {isMcp && (
                        it.requiresCredential ? (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-0.5 border-amber-300 text-amber-700 bg-amber-50/60 dark:bg-amber-950/30">
                            <KeyRound className="w-2.5 h-2.5" />需凭据
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-emerald-300 text-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/30">
                            免凭据
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                  {isMcp ? (
                    <Switch checked={sel} onCheckedChange={() => onToggle(it.name)} className="shrink-0" />
                  ) : (
                    sel && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  )}
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
                  {!isMcp && (
                    <Button
                      size="sm"
                      variant={sel ? "outline" : "default"}
                      className="h-6 text-[10px] px-2"
                      onClick={() => onToggle(it.name)}
                    >
                      {sel ? "移除" : "添加"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && (
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
