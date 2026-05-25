import { useState } from "react";
import { X, FileText, Image as ImageIcon, FileCode, FileSpreadsheet, FileArchive, Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBytes, guessTypeFromName, type ArtifactType } from "@/data/artifacts";

export interface PendingAttachment {
  id: string;
  name: string;
  size: number;
  type: ArtifactType;
  mime: string;
  /** dataURL or blob URL for preview */
  url?: string;
  progress: number; // 0-100
}

const IconFor = ({ type, className }: { type: ArtifactType; className?: string }) => {
  switch (type) {
    case "image":
      return <ImageIcon className={className} />;
    case "doc":
    case "pdf":
      return <FileText className={className} />;
    case "table":
      return <FileSpreadsheet className={className} />;
    case "code":
      return <FileCode className={className} />;
    case "audio":
    case "video":
      return <FileArchive className={className} />;
    default:
      return <FileText className={className} />;
  }
};

export const AttachmentChip = ({
  att,
  onRemove,
}: {
  att: PendingAttachment;
  onRemove?: () => void;
}) => {
  const uploading = att.progress < 100;
  return (
    <div className="inline-flex items-center gap-2 bg-muted/60 border border-border rounded-md pl-1 pr-1.5 py-1 max-w-[220px]">
      {att.type === "image" && att.url ? (
        <img src={att.url} alt={att.name} className="w-8 h-8 rounded object-cover shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded bg-background flex items-center justify-center shrink-0">
          <IconFor type={att.type} className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-foreground truncate">{att.name}</div>
        {uploading ? (
          <div className="mt-0.5">
            <Progress value={att.progress} className="h-1" />
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground">{formatBytes(att.size)}</div>
        )}
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="移除"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

/** 已发送消息中的附件展示 */
export const SentAttachment = ({ att }: { att: PendingAttachment }) => {
  const [openImg, setOpenImg] = useState(false);
  const type = att.type ?? guessTypeFromName(att.name);
  if (type === "image" && att.url) {
    return (
      <>
        <button
          onClick={() => setOpenImg(true)}
          className="block rounded-lg overflow-hidden border border-border max-w-[200px] hover:opacity-90 transition-opacity"
        >
          <img src={att.url} alt={att.name} className="w-full h-auto" />
        </button>
        <Dialog open={openImg} onOpenChange={setOpenImg}>
          <DialogContent className="max-w-3xl p-2">
            <img src={att.url} alt={att.name} className="w-full h-auto rounded" />
          </DialogContent>
        </Dialog>
      </>
    );
  }
  return (
    <div className={cn("inline-flex items-center gap-2 bg-card border border-border rounded-md px-2 py-1.5 max-w-[260px]")}>
      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
        <IconFor type={type} className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-foreground truncate">{att.name}</div>
        <div className="text-[10px] text-muted-foreground">{formatBytes(att.size)}</div>
      </div>
      <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" title="下载">
        <Download className="w-3 h-3" />
      </Button>
    </div>
  );
};
