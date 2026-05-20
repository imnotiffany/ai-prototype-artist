import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2, XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export type FsAlertStatus = "draft" | "connecting" | "failed";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** 触发拦截时的丰声连接状态 */
  status: FsAlertStatus;
  /** 点「返回修改」时的额外回调（比如聚焦到对应输入框） */
  onReturn?: () => void;
}

const COPY: Record<FsAlertStatus, { title: string; desc: string; icon: typeof AlertTriangle; tone: string }> = {
  draft: {
    title: "丰声 NEXT 机器人尚未连接",
    desc: "已填写凭证但未点击「连接」测试。请先连接成功，或清空凭证后再保存 / 发布。",
    icon: AlertTriangle,
    tone: "text-amber-500",
  },
  connecting: {
    title: "正在连接丰声 NEXT…",
    desc: "请等待连接完成后再保存 / 发布。",
    icon: Loader2,
    tone: "text-primary animate-spin",
  },
  failed: {
    title: "丰声 NEXT 连接失败",
    desc: "已填写的 Client ID / Secret / Robot Code 校验未通过，请检查凭证是否正确后重试。",
    icon: XCircle,
    tone: "text-destructive",
  },
};

/**
 * 当丰声 NEXT 处于 draft / connecting / failed 时，
 * 保存或发布操作会被拦截并弹出本提醒。
 * 统一只提供「返回修改」一个按钮，让用户回到配置区自行处理。
 */
export const FengshengIncompleteDialog = ({ open, onOpenChange, status, onReturn }: Props) => {
  const copy = COPY[status];
  const Icon = copy.icon;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm flex items-center gap-1.5">
            <Icon className={`w-4 h-4 ${copy.tone}`} />
            {copy.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs leading-relaxed pt-1">
            {copy.desc}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => {
              onReturn?.();
              onOpenChange(false);
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回修改
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
