import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload } from "lucide-react";
import { categories } from "@/data/mockData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateAgentDialog = ({ open, onOpenChange }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>创建智能体</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>智能体文件 <span className="text-destructive">*</span></Label>
            <div className="mt-1.5 border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">点击或拖拽上传 agent.md 文件</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>智能体名称 <span className="text-destructive">*</span></Label>
              <Input className="mt-1.5" placeholder="从 md 文件自动解析" disabled />
            </div>
            <div>
              <Label>版本号 <span className="text-destructive">*</span></Label>
              <Input className="mt-1.5" value="v0.0.1" disabled />
            </div>
          </div>
          <div>
            <Label>智能体描述 <span className="text-destructive">*</span></Label>
            <Textarea className="mt-1.5" placeholder="描述智能体的功能，不超过60字" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>智能体分类 <span className="text-destructive">*</span></Label>
              <Select>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="选择分类" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>运行模型 <span className="text-destructive">*</span></Label>
              <Input className="mt-1.5" value="claude-sonnet" disabled />
            </div>
          </div>
          <div>
            <Label>智能体标签</Label>
            <Input className="mt-1.5" placeholder="输入标签，逗号分隔" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>挂载 Skill</Label>
              <Input className="mt-1.5" placeholder="从 Skill 市场选择" />
            </div>
            <div>
              <Label>挂载 MCP 服务器</Label>
              <Input className="mt-1.5" placeholder="从 MCP 广场选择" />
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
