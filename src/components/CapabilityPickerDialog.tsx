import { useMemo, useState, ReactNode, useEffect } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tag } from "lucide-react";
import { CheckCircle2, ExternalLink, Plus, KeyRound, Upload, ShieldCheck, Settings2 } from "lucide-react";
import { isMcpConfigured, subscribeMcpStore } from "@/data/mcpCredentialStore";

export interface PickerItem {
  name: string;
  description: string;
  /** MCP 专用：服务商分组 */
  provider?: "lh" | "dd";
  /** MCP 专用：是否需要凭据 */
  requiresCredential?: boolean;
  /** Skill 专用：来源范围 */
  scope?: "market" | "project";
  /** Skill 专用：标签 */
  tags?: string[];
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
  const hasScopes = !isMcp && items.some((i) => i.scope);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [skillScope, setSkillScope] = useState<"market" | "project">("market");
  const [skillTag, setSkillTag] = useState<string>("__all__");
  const [orderSnapshot, setOrderSnapshot] = useState<string[]>([]);

  // 订阅 MCP 凭据 store，使「未配置 → 已配置」状态变更后立即反映
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isMcp) return;
    const unsub = subscribeMcpStore(() => setTick((t) => t + 1));
    return () => { unsub(); };
  }, [isMcp]);

  const handleOpenChange = (o: boolean) => {
    if (o) setOrderSnapshot(selected);
    setOpen(o);
  };

  // Skill 标签集合（按当前 scope 过滤）
  const availableTags = useMemo(() => {
    if (!isSkill) return [] as string[];
    const set = new Set<string>();
    items.forEach((it) => {
      if (hasScopes && (it.scope ?? "market") !== skillScope) return;
      (it.tags ?? []).forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [isSkill, items, hasScopes, skillScope]);

  // 切换 scope 时若当前标签不在新范围内，重置
  useEffect(() => {
    if (!isSkill) return;
    if (skillTag !== "__all__" && !availableTags.includes(skillTag)) setSkillTag("__all__");
  }, [isSkill, availableTags, skillTag]);

  const filtered = items.filter((it) => {
    if (hasScopes && (it.scope ?? "market") !== skillScope) return false;
    if (isSkill && skillTag !== "__all__" && !(it.tags ?? []).includes(skillTag)) return false;
    const q = search.toLowerCase();
    return it.name.toLowerCase().includes(q) || it.description.toLowerCase().includes(q);
  });

  // MCP 拼装可用性：免凭据 || 已配置凭据
  const isAvailable = (it: PickerItem) =>
    !isMcp || !it.requiresCredential || isMcpConfigured(it.name);

  const sortedAvailable = useMemo(() => {
    const avail = filtered.filter(isAvailable);
    if (!isMcp) return avail;
    const newlyOn = avail.filter((it) => selected.includes(it.name) && !orderSnapshot.includes(it.name));
    const wasOn = avail.filter((it) => orderSnapshot.includes(it.name));
    const rest = avail.filter((it) => !selected.includes(it.name) && !orderSnapshot.includes(it.name));
    return [...newlyOn, ...wasOn, ...rest];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, selected, orderSnapshot, isMcp]);

  const unconfigured = isMcp ? filtered.filter((it) => !isAvailable(it)) : [];

  const marketCount = items.filter((i) => (i.scope ?? "market") === "market").length;
  const projectCount = items.filter((i) => i.scope === "project").length;
  const marketLabel = isMcp ? "前往 MCP 管理" : `前往${isSkill ? "Skill 广场" : "智能体广场"}`;
  const skillUploadUrl = "https://ai.sf-express.com/project/enter/skill-app/skills/project";
  const mcpManageHref = "/vault";

  const renderCard = (it: PickerItem, opts: { disabled?: boolean }) => {
    const sel = selected.includes(it.name);
    const disabled = !!opts.disabled;
    return (
      <div
        key={it.name}
        className={`border rounded-lg p-3 transition-colors ${
          disabled
            ? "border-dashed border-border bg-muted/30 opacity-80"
            : sel
              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
              : "border-border hover:border-primary/40 bg-card"
        }`}
      >
        <div className="flex items-start gap-2 mb-1.5">
          <div
            className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
              sel && !disabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate">{it.name}</p>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              {isMcp && (
                it.requiresCredential ? (
                  isMcpConfigured(it.name) ? (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-0.5 border-emerald-300 text-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/30">
                      <CheckCircle2 className="w-2.5 h-2.5" />已配置凭据
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-0.5 border-amber-300 text-amber-700 bg-amber-50/60 dark:bg-amber-950/30">
                      <KeyRound className="w-2.5 h-2.5" />未配置凭据
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-0.5 border-emerald-300 text-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/30">
                    <ShieldCheck className="w-2.5 h-2.5" />免凭据
                  </Badge>
                )
              )}
              {isSkill && (it.tags ?? []).map((t) => (
                <Badge key={t} variant="outline" className="text-[10px] h-4 px-1.5 font-normal text-muted-foreground">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          {isMcp ? (
            disabled ? null : (
              sel && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            )
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
          {isMcp && disabled ? (
            <Link
              to={mcpManageHref}
              onClick={() => setOpen(false)}
              className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
              title="前往 MCP 管理配置凭据"
            >
              <Settings2 className="w-2.5 h-2.5" />去配置
            </Link>
          ) : (
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
  };

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
        {hasScopes && (
          <Tabs value={skillScope} onValueChange={(v) => setSkillScope(v as "market" | "project")}>
            <TabsList className="h-8">
              <TabsTrigger value="market" className="text-xs h-6 px-3">市场 {label} <span className="ml-1 text-muted-foreground">({marketCount})</span></TabsTrigger>
              <TabsTrigger value="project" className="text-xs h-6 px-3">项目 {label} <span className="ml-1 text-muted-foreground">({projectCount})</span></TabsTrigger>
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
          {isSkill && availableTags.length > 0 && (
            <Select value={skillTag} onValueChange={setSkillTag}>
              <SelectTrigger className="h-8 w-[140px] text-xs shrink-0 gap-1">
                <Tag className="w-3 h-3 text-muted-foreground" />
                <SelectValue placeholder="标签" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">全部标签</SelectItem>
                {availableTags.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isMcp ? (
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs shrink-0">
              <Link to={mcpManageHref} onClick={() => setOpen(false)}>{marketLabel}</Link>
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

        <div className="overflow-auto -mx-1 px-1 space-y-3">
          {/* 可选区：免凭据 + 已配置 */}
          {isMcp && (
            <div className="flex items-center gap-2 sticky top-0 bg-background py-1 z-10">
              <span className="text-[11px] font-semibold text-foreground">可选</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">{sortedAvailable.length}</Badge>
              <span className="text-[10px] text-muted-foreground">免凭据 / 已配置凭据</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            {sortedAvailable.map((it) => renderCard(it, { disabled: false }))}
            {sortedAvailable.length === 0 && (
              <p className="col-span-2 text-center text-xs text-muted-foreground py-6">
                暂无{isMcp ? "可选 MCP" : `匹配的 ${label}`}
              </p>
            )}
          </div>

          {/* 未配置区：仅 MCP */}
          {isMcp && unconfigured.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-2 sticky top-0 bg-background py-1 z-10 mt-2 pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-foreground">未配置凭据</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal border-amber-300 text-amber-700 bg-amber-50/60">
                    {unconfigured.length}
                  </Badge>
                </div>
                <Link
                  to={mcpManageHref}
                  onClick={() => setOpen(false)}
                  className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                >
                  <Settings2 className="w-3 h-3" />前往 MCP 管理配置
                </Link>
              </div>
              <p className="text-[10px] text-muted-foreground -mt-1">
                以下 MCP 需要先在「MCP 管理 → 新增 MCP」中配置凭据，配置完成后即可在此处选用。
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {unconfigured.map((it) => renderCard(it, { disabled: true }))}
              </div>
            </>
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
