import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { mockCredentials } from "@/data/mockData";

const VaultPage = () => {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="p-6 max-w-[1000px] mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">凭据金库</h1>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          新增凭据
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>凭据名称</TableHead>
              <TableHead>凭据类型</TableHead>
              <TableHead>关联 MCP 服务器</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockCredentials.map((cred) => (
              <TableRow key={cred.id}>
                <TableCell className="font-medium">{cred.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{cred.type}</Badge>
                </TableCell>
                <TableCell>{cred.mcpServer}</TableCell>
                <TableCell>{cred.createdAt}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增凭据</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>凭据名称</Label>
              <Input className="mt-1.5" placeholder="自定义名称" />
            </div>
            <div>
              <Label>凭据类型</Label>
              <Select>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="选择类型" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                  <SelectItem value="oauth">OAuth 2.0</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>关联 MCP 服务器</Label>
              <Input className="mt-1.5" placeholder="选择 MCP 服务器" />
            </div>
            <div>
              <Label>Token 值</Label>
              <Input className="mt-1.5" type="password" placeholder="输入 Token" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={() => setCreateOpen(false)}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VaultPage;
