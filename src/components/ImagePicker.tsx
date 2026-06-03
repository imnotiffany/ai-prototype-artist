import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  platformImages,
  customImages,
  findImage,
  type ImageSource,
} from "@/data/environments";

export interface ImageSelection {
  source: ImageSource;
  imageId: string;
  version: string;
}

interface Props {
  value: ImageSelection;
  onChange: (v: ImageSelection) => void;
  className?: string;
}

const SOURCES: { key: ImageSource; label: string }[] = [
  { key: "platform", label: "平台镜像" },
  { key: "custom", label: "自定义镜像" },
];

const tagClass = (_tag?: string) =>
  "border-emerald-500/30 text-emerald-600 bg-emerald-500/10";

export const ImagePicker = ({ value, onChange, className }: Props) => {
  const [open, setOpen] = useState(false);
  const [hoverSource, setHoverSource] = useState<ImageSource>(value.source);
  const [hoverImageId, setHoverImageId] = useState<string>(value.imageId);

  const imageList = hoverSource === "platform" ? platformImages : customImages;
  const hoverImage = useMemo(
    () => imageList.find((i) => i.id === hoverImageId) ?? imageList[0],
    [imageList, hoverImageId],
  );
  const selectedImage = findImage(value.source, value.imageId);
  const display = selectedImage
    ? `${selectedImage.name} · ${value.version}`
    : "请选择镜像";

  const handleOpen = (o: boolean) => {
    if (o) {
      setHoverSource(value.source);
      setHoverImageId(value.imageId);
    }
    setOpen(o);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-xs transition-colors hover:border-ring/40 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/20 data-[state=open]:border-ring data-[state=open]:ring-1 data-[state=open]:ring-ring/20",
            !selectedImage && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate font-mono">{display}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-0 w-[--radix-popover-trigger-width] min-w-[640px]"
      >
        <div className="flex text-xs">
          {/* Col 1: source */}
          <div className="w-28 border-r border-border py-1 bg-muted/30">
            {SOURCES.map((s) => {
              const active = hoverSource === s.key;
              const disabled = s.key === "custom" && customImages.length === 0;
              return (
                <button
                  key={s.key}
                  type="button"
                  disabled={disabled}
                  onMouseEnter={() => !disabled && setHoverSource(s.key)}
                  onClick={() => {
                    if (disabled) return;
                    setHoverSource(s.key);
                    const list = s.key === "platform" ? platformImages : customImages;
                    if (list[0]) setHoverImageId(list[0].id);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-foreground/80",
                    disabled && "opacity-40 cursor-not-allowed",
                  )}
                >
                  <span>{s.label}</span>
                  <ChevronRight className="w-3 h-3 opacity-60" />
                </button>
              );
            })}
          </div>

          {/* Col 2: image names */}
          <div className="flex-1 min-w-0 border-r border-border py-1 max-h-72 overflow-auto">
            {imageList.length === 0 ? (
              <p className="px-3 py-6 text-center text-muted-foreground">
                暂无{hoverSource === "platform" ? "平台" : "自定义"}镜像
              </p>
            ) : (
              imageList.map((img) => {
                const active = hoverImageId === img.id;
                const isSelected =
                  value.source === hoverSource && value.imageId === img.id;
                return (
                  <button
                    key={img.id}
                    type="button"
                    onMouseEnter={() => setHoverImageId(img.id)}
                    onClick={() => {
                      setHoverImageId(img.id);
                      // 单版本镜像，点击即选
                      if (img.versions.length === 1) {
                        onChange({
                          source: hoverSource,
                          imageId: img.id,
                          version: img.versions[0].version,
                        });
                        setOpen(false);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors",
                      active ? "bg-muted" : "hover:bg-muted/60",
                      isSelected && "text-primary font-medium",
                    )}
                  >
                    <span className="font-mono truncate">{img.name}</span>
                    <ChevronRight className="w-3 h-3 opacity-60 shrink-0" />
                  </button>
                );
              })
            )}
          </div>

          {/* Col 3: versions */}
          <div className="w-40 py-1 max-h-72 overflow-auto">
            {hoverImage?.versions.map((v) => {
              const isSelected =
                value.source === hoverSource &&
                value.imageId === hoverImage.id &&
                value.version === v.version;
              return (
                <button
                  key={v.version}
                  type="button"
                  onClick={() => {
                    onChange({
                      source: hoverSource,
                      imageId: hoverImage.id,
                      version: v.version,
                    });
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors hover:bg-muted/60",
                    isSelected && "bg-primary/5 text-primary font-medium",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {isSelected && <Check className="w-3 h-3" />}
                    <span className="font-mono">{v.version}</span>
                  </span>
                  {v.tag && (
                    <Badge
                      variant="outline"
                      className={cn("h-4 px-1.5 text-[10px] font-normal", tagClass(v.tag))}
                    >
                      {v.tag}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
