import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Plus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const predefinedTags = [
  "文档处理", "数据分析", "编程开发", "内容创作", "企业办公",
  "前端开发", "后端开发", "产品经理", "测试开发", "算法工程",
  "运维支持", "研究分析", "视觉设计", "市场营销", "营运规划",
  "财务分析", "人力资源", "国际业务", "其他",
];

const popularEmojis = [
  "👍", "😊", "🤔", "😍", "😂", "😎", "🤗", "😄",
  "🤖", "🧠", "💡", "🔧", "📊", "📝", "🎯", "🚀",
  "💻", "🔍", "📁", "⚡", "🎨", "🌐", "📈", "🛠️",
];

export const UploadAgentDialog = ({ open, onOpenChange }: Props) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [customTag, setCustomTag] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState("");

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags((prev) => [...prev, customTag.trim()]);
      setCustomTag("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>创建智能体</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* File upload */}
          <div>
            <Label>智能体文件 <span className="text-destructive">*</span></Label>
            <div className="mt-1.5 border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">点击或拖拽上传 agent.md 文件</p>
              <p className="text-xs text-muted-foreground mt-1">上传 agent.md 后将自动解析md文件中的名称和描述</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <Label>智能体名称 <span className="text-destructive">*</span></Label>
            <Input className="mt-1.5" placeholder="必填，自动从md文件中解析，不可修改，不翻译成中文" disabled />
          </div>

          {/* Version */}
          <div>
            <Label>版本号 <span className="text-destructive">*</span></Label>
            <Input className="mt-1.5 text-primary" value="必填，新建智能体默认从v0.0.1开始，不可修改" disabled />
          </div>

          {/* Description */}
          <div>
            <Label>智能体描述 <span className="text-destructive">*</span></Label>
            <Textarea className="mt-1.5" placeholder="描述智能体的功能" rows={2} />
          </div>

          {/* Tags */}
          <div>
            <Label>智能体标签 <span className="text-destructive">*</span></Label>
            <div className="mt-1.5">
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map((tag) => (
                  <Badge key={tag} tag={tag} onRemove={() => toggleTag(tag)} />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowTagPicker(!showTagPicker)}
                className="text-sm text-primary hover:underline"
              >
                点击选择智能体标签
              </button>
              {showTagPicker && (
                <div className="mt-2 border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustomTag()}
                      placeholder="添加标签"
                      className="flex-1"
                    />
                    <Button size="sm" variant="outline" onClick={addCustomTag}>
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      自定义标签
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className="px-3 py-1 rounded-full text-xs bg-primary text-primary-foreground"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    {predefinedTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`hover:text-foreground transition-colors ${selectedTags.includes(tag) ? "text-primary font-medium" : ""}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowTagPicker(false)}>取消</Button>
                    <Button size="sm" onClick={() => setShowTagPicker(false)}>确定</Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Avatar */}
          <div>
            <Label>智能体头像</Label>
            <div className="mt-1.5">
              <Button
                variant="outline"
                className="w-full justify-center gap-2"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                {selectedEmoji ? (
                  <span className="text-2xl">{selectedEmoji}</span>
                ) : (
                  "点击选择头像"
                )}
              </Button>
              {showEmojiPicker && (
                <div className="mt-2 border border-border rounded-lg p-4 space-y-3">
                  <div className="text-xs text-muted-foreground font-medium mb-2">表情符号</div>
                  <div className="grid grid-cols-8 gap-2">
                    {popularEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setSelectedEmoji(emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="w-9 h-9 flex items-center justify-center text-xl rounded hover:bg-secondary transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowEmojiPicker(false)}>取消</Button>
                    <Button size="sm" onClick={() => setShowEmojiPicker(false)}>确认</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={() => onOpenChange(false)}>确认创建</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Badge = ({ tag, onRemove }: { tag: string; onRemove: () => void }) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
    {tag}
    <button onClick={onRemove} className="hover:text-destructive">
      <X className="w-3 h-3" />
    </button>
  </span>
);
