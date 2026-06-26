import { useEffect, useState } from "react";
import { ChevronDown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { isMcpConfigured, subscribeMcpStore } from "@/data/mcpCredentialStore";

export const OFFICE_MCP_SKUS: { id: string; name: string; mcp: string }[] = [
  { id: "dingtalk-doc", name: "钉钉文档", mcp: "钉钉文档" },
  { id: "dingtalk-ai-sheet", name: "钉钉 AI 表格", mcp: "钉钉 AI 表格" },
  { id: "dingtalk-sheet", name: "钉钉表格", mcp: "钉钉表格" },
  { id: "dingtalk-robot", name: "机器人消息", mcp: "机器人消息" },
];
export const OFFICE_SKILL_SKUS: { id: string; name: string; skill: string; code: string }[] = [
  { id: "skill-xlsx", name: "表格处理", skill: "Excel处理", code: "xlsx" },
  { id: "skill-docx", name: "文档处理", skill: "Word文档", code: "docx" },
  { id: "skill-pdf", name: "PDF 处理", skill: "PDF处理", code: "pdf" },
  { id: "skill-pptx", name: "PPT 处理", skill: "PPT生成", code: "pptx" },
];

const DEFAULT_VER = "v1.0.0";

interface Props {
  selMcps: string[];
  selSkills: string[];
  addMcp: (name: string, version?: string) => void;
  removeMcp: (name: string) => void;
  addSkill: (name: string, version?: string) => void;
  removeSkill: (name: string) => void;
  defaultOpen?: boolean;
}

export default function OfficeSuiteSection({
  selMcps,
  selSkills,
  addMcp,
  removeMcp,
  addSkill,
  removeSkill,
  defaultOpen = false,
}: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(defaultOpen);
  const [, setTick] = useState(0);
  const [alertMcp, setAlertMcp] = useState<string | null>(null);
  useEffect(() => subscribeMcpStore(() => setTick((v) => v + 1)), []);

  const isMcpOn = (name: string) => selMcps.includes(name);
  const isSkillOn = (name: string) => selSkills.includes(name);

  const anyOn =
    OFFICE_MCP_SKUS.some((s) => isMcpOn(s.mcp)) ||
    OFFICE_SKILL_SKUS.some((s) => isSkillOn(s.skill));

  const enableAll = (on: boolean) => {
    if (on) {
      OFFICE_MCP_SKUS.forEach((s) => {
        if (!isMcpConfigured(s.mcp)) return;
        if (!isMcpOn(s.mcp)) addMcp(s.mcp, DEFAULT_VER);
      });
      OFFICE_SKILL_SKUS.forEach((s) => {
        if (!isSkillOn(s.skill)) addSkill(s.skill, DEFAULT_VER);
      });
    } else {
      OFFICE_MCP_SKUS.forEach((s) => isMcpOn(s.mcp) && removeMcp(s.mcp));
      OFFICE_SKILL_SKUS.forEach((s) => isSkillOn(s.skill) && removeSkill(s.skill));
    }
  };

  const toggleItem = (kind: "mcp" | "skill", target: string) => {
    if (kind === "mcp") {
      if (!isMcpConfigured(target)) {
        setAlertMcp(target);
        return;
      }
      isMcpOn(target) ? removeMcp(target) : addMcp(target, DEFAULT_VER);
    } else {
      isSkillOn(target) ? removeSkill(target) : addSkill(target, DEFAULT_VER);
    }
  };

  const renderRow = (
    sku: { id: string; name: string; code?: string },
    kind: "mcp" | "skill",
    target: string,
  ) => {
    const on = kind === "mcp" ? isMcpOn(target) : isSkillOn(target);
    const configured = kind === "skill" || isMcpConfigured(target);
    return (
      <label key={sku.id} className="flex items-center gap-2 py-1.5 cursor-pointer min-w-0">
        <input
          type="checkbox"
          checked={on}
          onChange={() => toggleItem(kind, target)}
          className="w-3.5 h-3.5 rounded border-border accent-primary cursor-pointer shrink-0"
        />
        <span className={`text-xs truncate ${configured ? "" : "text-muted-foreground"}`}>
          {sku.name}
          {sku.code && (
            <span className="ml-1 text-[10px] text-muted-foreground font-mono">{sku.code}</span>
          )}
        </span>
        {kind === "mcp" && !configured && (
          <span className="text-[10px] text-amber-600 dark:text-amber-500 shrink-0">未配置</span>
        )}
      </label>
    );
  };

  return (
    <>
      <div className="rounded-xl bg-muted/30">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <ChevronDown
              className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
                open ? "" : "-rotate-90"
              }`}
            />
            <span className="text-xs font-medium">办公套件</span>
            <span className="text-[11px] text-muted-foreground">
              让智能体与钉钉无缝协作的常用能力
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="text-[11px] text-muted-foreground">全部启用</span>
            <Switch checked={anyOn} onCheckedChange={(v) => enableAll(v)} />
          </div>
        </button>
        {open && (
          <div className="px-5 pb-4 pt-1 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-[11px] text-muted-foreground shrink-0 pt-2 w-10">MCP</span>
              <div className="grid grid-cols-4 gap-x-4 gap-y-0 flex-1 min-w-0">
                {OFFICE_MCP_SKUS.map((s) => renderRow(s, "mcp", s.mcp))}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[11px] text-muted-foreground shrink-0 pt-2 w-10">Skill</span>
              <div className="grid grid-cols-4 gap-x-4 gap-y-0 flex-1 min-w-0">
                {OFFICE_SKILL_SKUS.map((s) => renderRow(s, "skill", s.skill))}
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!alertMcp} onOpenChange={(o) => !o && setAlertMcp(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">该 MCP 还未配置</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed pt-1">
              「{alertMcp}」尚未在「MCP 管理」中完成配置，请先前往配置完毕后再回到这里启用。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setAlertMcp(null)}
            >
              稍后
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => {
                setAlertMcp(null);
                navigate("/vault");
              }}
            >
              前往 MCP 管理 <ArrowRight className="w-3 h-3" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
