import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { setMcpConfigured } from "@/data/mcpCredentialStore";

const STORAGE_KEY = "dingtalk_mcp_config_v1";

export type DingtalkConfig = {
  doc?: string;
  sheet?: string;
  aiSheet?: string;
};

const ITEMS: { key: keyof DingtalkConfig; name: string; mcpName: string; href: string }[] = [
  { key: "doc", name: "钉钉文档", mcpName: "钉钉文档MCP", href: "https://open.dingtalk.com/document/orgapp/dingtalk-doc-mcp" },
  { key: "sheet", name: "钉钉表格", mcpName: "钉钉表格MCP", href: "https://open.dingtalk.com/document/orgapp/dingtalk-sheet-mcp" },
  { key: "aiSheet", name: "钉钉 AI 表格", mcpName: "AI表格MCP", href: "https://open.dingtalk.com/document/orgapp/dingtalk-ai-sheet-mcp" },
];

export const getDingtalkConfig = (): DingtalkConfig => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

export const isDingtalkFullyConfigured = (): boolean => {
  const cfg = getDingtalkConfig();
  return !!(cfg.doc && cfg.sheet && cfg.aiSheet);
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export const DingtalkSetupDialog = ({ open, onOpenChange, onSaved }: Props) => {
  const [cfg, setCfg] = useState<DingtalkConfig>({});

  useEffect(() => {
    if (open) setCfg(getDingtalkConfig());
  }, [open]);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    ITEMS.forEach((it) => {
      if (cfg[it.key]?.trim()) setMcpConfigured(it.mcpName, true);
    });
    toast.success("配置已保存");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] p-6">
        <DialogHeader>
          <DialogTitle className="text-base">前置配置钉钉MCP，让Claude智能体与丰声NEXT无缝协作</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1.5">点击「前往获取」打开钉钉授权页，复制鉴权链接后粘贴回这里即可。</p>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {ITEMS.map((it) => (
            <div key={it.key} className="border-b border-border pb-4 last:border-b-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{it.name}</span>
                <a
                  href={it.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  前往获取 <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <Input
                value={cfg[it.key] || ""}
                onChange={(e) => setCfg((p) => ({ ...p, [it.key]: e.target.value }))}
                placeholder="粘贴鉴权 URL"
                className="h-8 text-xs"
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            稍后再说
          </button>
          <Button size="sm" onClick={handleSave} className="rounded-full px-5">保存配置</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
