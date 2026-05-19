import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { AlertTriangle, Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onGoConnect: () => void;
  onClearConfig: () => void;
}

/**
 * 当用户填写了丰声 NEXT 的凭据但未连接成功时，
 * 保存/发布前强制弹出此提醒：必须连接成功，或删除配置内容，才能继续。
 */
export const FengshengIncompleteDialog = ({ open, onOpenChange, onGoConnect, onClearConfig }: Props) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            丰声 NEXT 机器人尚未连接成功
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs leading-relaxed pt-1">
            丰声 NEXT 机器人尚未连接成功，请先在配置中<span className="font-medium text-foreground">连接成功</span>或<span className="font-medium text-foreground">删除配置内容</span>，才可发布 / 保存。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
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
            删除配置内容
          </Button>
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
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
