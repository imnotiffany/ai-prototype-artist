import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { AlertTriangle, Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** 跳转到丰声 NEXT 配置区域 / 聚焦输入项 */
  onGoConnect: () => void;
  /** 清空当前已填写的 ClientID / Secret / RobotCode */
  onClearConfig: () => void;
}

/**
 * 当用户填写了丰声 NEXT 的 Client ID / Client Secret / Robot Code，
 * 但未点击「连接」并连接成功时，保存/发布前弹出此提醒，
 * 强制用户在「完成连接」与「清空配置」之间做出选择。
 */
export const FengshengIncompleteDialog = ({ open, onOpenChange, onGoConnect, onClearConfig }: Props) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            丰声 NEXT 尚未连接
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs leading-relaxed pt-1">
            你已填写丰声 NEXT 的 <span className="font-medium text-foreground">Client ID / Client Secret / Robot Code</span>，
            但还没有点击「连接」并连接成功。
            <br />
            <br />
            为避免在未连通的情况下误以为已生效，<span className="text-destructive font-medium">必须先完成连接，或清空相关配置</span>，才能继续保存 / 发布。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              暂不处理
            </Button>
          </AlertDialogCancel>
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
            清空配置
          </Button>
          <AlertDialogAction asChild>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => {
                onGoConnect();
                onOpenChange(false);
              }}
            >
              <Link2 className="w-3.5 h-3.5" />
              去连接
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
