import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, HelpCircle } from "lucide-react";

export const FENGSHENG_DOC_URL = "https://docs.example.com/fengsheng-next/robot";

/**
 * 可收起的「如何创建丰声 NEXT 机器人」说明卡。
 * 在所有需要配置丰声 NEXT 凭证的地方复用，保证文案与跳转一致。
 */
export const FengshengHowToCard = ({ defaultOpen = false }: { defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-md bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50 rounded-md transition-colors"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <HelpCircle className="w-3.5 h-3.5 text-primary" />
        如何创建丰声 NEXT 机器人？
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 space-y-2 text-[11px] text-muted-foreground leading-relaxed animate-fade-in">
          <p>丰声 NEXT 机器人需要在开发者后台手动创建，无法通过 API 自动创建。请按以下步骤操作：</p>
          <ol className="space-y-1 pl-4 list-decimal">
            <li>
              参考{" "}
              <a
                href={FENGSHENG_DOC_URL}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                丰声文档 <ExternalLink className="w-3 h-3" />
              </a>{" "}
              完成机器人创建和配置
            </li>
            <li>将获取的凭据填入下方配置</li>
          </ol>
          <div className="border border-primary/30 bg-primary/5 rounded px-2.5 py-1.5 text-[11px] text-foreground/80">
            提示：机器人创建后，需要管理员在「可见范围」中设置哪些员工可以使用该机器人。
          </div>
        </div>
      )}
    </div>
  );
};
