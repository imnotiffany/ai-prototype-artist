import { useState } from "react";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, PanelLeftClose, PanelLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface SessionListItem {
  id: string;
  title: string;
  lastActiveAt: string;
}

interface SessionDrawerProps {
  sessions: SessionListItem[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export const SessionDrawer = ({
  sessions, currentId, onSelect, onNew, onRename, onDelete, collapsed, onToggle,
}: SessionDrawerProps) => {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  if (collapsed) {
    return (
      <div className="w-12 border-r border-border flex flex-col items-center py-2 gap-1 shrink-0 bg-muted/30">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle} title="展开会话列表">
          <PanelLeft className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNew} title="新建会话">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  const filtered = sessions.filter((s) => s.title.toLowerCase().includes(query.toLowerCase()));

  const commitRename = () => {
    if (editingId && editingValue.trim()) onRename(editingId, editingValue.trim());
    setEditingId(null);
  };

  return (
    <div className="w-60 border-r border-border flex flex-col shrink-0 bg-muted/30">
      <div className="h-12 flex items-center justify-between px-3 border-b border-border shrink-0">
        <span className="text-xs font-medium text-muted-foreground">历史会话</span>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNew} title="新建会话">
            <Plus className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggle} title="收起">
            <PanelLeftClose className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-2 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索会话"
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-2 pb-2 space-y-0.5">
          {filtered.length === 0 && (
            <div className="text-xs text-muted-foreground px-2 py-6 text-center">暂无会话</div>
          )}
          {filtered.map((s) => {
            const active = s.id === currentId;
            return (
              <div
                key={s.id}
                onClick={() => editingId !== s.id && onSelect(s.id)}
                className={cn(
                  "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs",
                  active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                )}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  {editingId === s.id ? (
                    <Input
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-6 text-xs px-1"
                    />
                  ) : (
                    <>
                      <div className="truncate font-medium">{s.title}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{s.lastActiveAt}</div>
                    </>
                  )}
                </div>
                {editingId !== s.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(s.id);
                          setEditingValue(s.title);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5 mr-2" />重命名
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(s.id);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
