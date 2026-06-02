import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RefreshCw, Loader2, Upload, X, Bot } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  /** 当前已上传的头像（data URL）；为空则使用 AI 生成的头像 */
  uploadedAvatar: string | null;
  onUploadedAvatarChange: (v: string | null) => void;
  /** dicebear 生成种子 */
  seed: string;
  onSeedChange: (v: string) => void;
  label?: string;
  noun?: string;
}

export const AvatarPicker = ({
  uploadedAvatar,
  onUploadedAvatarChange,
  seed,
  onSeedChange,
  label = "头像",
  noun = "智能体",
}: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generating, setGenerating] = useState(false);
  const generatedAvatarUrl = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(seed)}&backgroundColor=dbeafe,fde68a,bbf7d0,fecaca,e9d5ff`;
  const avatarUrl = uploadedAvatar || generatedAvatarUrl;

  const regenerate = () => {
    onUploadedAvatarChange(null);
    setGenerating(true);
    setTimeout(() => {
      onSeedChange(Math.random().toString(36).slice(2, 10) + Date.now().toString(36));
      setGenerating(false);
    }, 600);
  };

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "请选择图片文件", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "图片大小不能超过 2MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onUploadedAvatarChange(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div>
      {label && <Label className="text-xs">{label}</Label>}
      <div className="mt-1.5 flex items-center gap-3">
        <div className="relative w-14 h-14 rounded-lg border border-border bg-muted/40 overflow-hidden flex items-center justify-center shrink-0">
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <img src={avatarUrl} alt={`${noun}头像`} className="w-full h-full object-cover" />
          )}
          {uploadedAvatar && !generating && (
            <button
              type="button"
              onClick={() => onUploadedAvatarChange(null)}
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-background/90 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
              title="移除上传"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={handleUploadClick} title="上传头像">
            <Upload className="w-3.5 h-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={regenerate} disabled={generating} title="AI 重新生成">
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};
