import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { AlertTriangle, CheckCircle2, Link2, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type FsStatus = "connected" | "incomplete" | "empty";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  status: FsStatus;
  /** 跳转到丰声 NEXT 配置区域 / 聚焦输入项（不继续保存/发布） */
  onGoConnect: () => void;
  /** 清空当前已填写的 ClientID / Secret / RobotCode，并继续保存/发布 */
  onClearConfig: () => void;
  /** 用户确认当前状态，继续保存/发布 */
  onContinue: () => void;
  /** 当前动作描述：保存草稿 / 发布 */
  actionLabel?: string;
}

/**
 * 在用户首次点击「保存草稿」或「发布」时弹出，
 * 让用户明确感知丰声 NEXT 机器人当前的连接状态，
 * 避免「填写了凭据就以为生效」或「忘了配机器人」等误解。
 */
export const FengshengIncompleteDialog = ({
  open,
  onOpenChange,
  status,
  onGoConnect,
  onClearConfig,
  onContinue,
  actionLabel = "保存 / 发布",
}: Props) => {
  const isConnected = status === "connected";
  const isEmpty = status === "empty";

  const title = isConnected
    ? "丰声 NEXT 机器人已连接"
    : isEmpty
    ? "尚未配置丰声 NEXT 机器人"
    : "丰声 NEXT 机器人未连接";

  const Icon = isConnected ? CheckCircle2 : AlertTriangle;
  const iconCls = isConnected ? "text-emerald-500" : "text-amber-500";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm flex items-center gap-1.5">
            <Icon className={`w-4 h-4 ${iconCls}`} />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs leading-relaxed pt-1 space-y-2">
            {isConnected && (
              <span className="block">
                当前智能体已与 <span className="font-medium text-foreground">丰声 NEXT 机器人</span> 完成连接，{actionLabel}后即可在群聊中触发。
                若不再需要，可在此移除机器人配置。
              </span>
            )}
            {status === "incomplete" && (
              <span className="block">
                你已填写丰声 NEXT 的 <span className="font-medium text-foreground">Client ID / Client Secret / Robot Code</span>，
                但还没有点击「连接」并连接成功。
                <br />
                <span className="text-destructive font-medium">未连接的情况下机器人不会生效</span>，建议先去完成连接，或移除相关配置。
              </span>
            )}
            {isEmpty && (
              <span className="block">
                你尚未配置丰声 NEXT 机器人，本智能体将<span className="font-medium text-foreground">仅在 Web 端 / API 等渠道</span>可用。
                如需在丰声群聊中触发，请先去配置并连接机器人。
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => {
              onGoConnect();
              onOpenChange(false);
            }}
          >
            <Link2 className="w-3.5 h-3.5" />
            {isConnected ? "查看配置" : "去连接"}
          </Button>
          {!isEmpty && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => {
                onClearConfig();
                onOpenChange(false);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              移除机器人配置
            </Button>
          )}
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => {
              onContinue();
              onOpenChange(false);
            }}
          >
            知道了，继续{actionLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
