import { cn } from "@/lib/utils";

export type AgentRuntimeStatus = "starting" | "running" | "done" | "failed" | "stopped";

const config: Record<AgentRuntimeStatus, { label: string; cls: string; dotCls?: string }> = {
  starting: { label: "启动中", cls: "bg-muted-foreground/10 text-muted-foreground" },
  running: {
    label: "运行中",
    cls: "bg-warning/10 text-warning",
    dotCls: "bg-warning",
  },
  done: { label: "已完成", cls: "bg-green-500/10 text-green-600" },
  failed: { label: "失败", cls: "bg-destructive/10 text-destructive" },
  stopped: { label: "已停止", cls: "bg-muted-foreground/10 text-muted-foreground" },
};

interface Props {
  status: AgentRuntimeStatus;
  className?: string;
}

export const AgentRuntimeBadge = ({ status, className }: Props) => {
  const c = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none",
        c.cls,
        className,
      )}
    >
      {status === "running" && (
        <span className={cn("w-[6px] h-[6px] rounded-full animate-pulse", c.dotCls)} aria-hidden />
      )}
      {c.label}
    </span>
  );
};
