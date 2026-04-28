import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Upload, Download, MessageSquare, Cpu, Server, Activity, Container, ScrollText, TrendingUp } from "lucide-react";
import { mockAgents, sharedResources } from "@/data/mockData";

const AgentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const agent = mockAgents.find((a) => a.id === id);

  if (!agent) return <div className="p-6">智能体不存在</div>;

  // Look up skill/MCP details from shared resources
  const skillDetails = agent.skills.map((s) => {
    const res = sharedResources.find((r) => r.name === s && r.type === "skill");
    return { name: s, description: res?.description ?? "" };
  });
  const mcpDetails = agent.mcpServers.map((s) => {
    const res = sharedResources.find((r) => r.name === s && r.type === "mcp");
    return { name: s, description: res?.description ?? "" };
  });

  return (
    <div className="p-6 max-w-[1200px] mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <button onClick={() => navigate(-1)} className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          返回
        </button>
        <span>/</span>
        <span className="text-foreground">{agent.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center text-3xl">
            {agent.avatar}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{agent.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{agent.description}</p>
            <div className="flex items-center gap-2 mt-2">
              {agent.tags.map((tag, i) => (
                <Badge key={i} variant={i === 0 ? "default" : "outline"} className="text-xs">{tag}</Badge>
              ))}
              <Badge variant="outline" className="text-xs">
                {agent.status === "published" ? "已发布" : agent.status === "draft" ? "草稿" : "项目"}
              </Badge>
            </div>
          </div>
        </div>
        <Button onClick={() => navigate(`/chat/${agent.id}`)} className="gap-1.5">
          <MessageSquare className="w-4 h-4" />
          开始对话
        </Button>
      </div>

      <Tabs defaultValue="detail">
        <TabsList>
          <TabsTrigger value="detail">智能体详情</TabsTrigger>
          <TabsTrigger value="runtime" className="gap-1.5"><Activity className="w-3.5 h-3.5" />运行状态</TabsTrigger>
          <TabsTrigger value="versions">版本管理</TabsTrigger>
        </TabsList>

        <TabsContent value="detail" className="mt-4 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">使用次数</div>
              <div className="text-2xl font-semibold mt-1">{agent.sessionCount}</div>
            </div>
            <div className="border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">下载次数</div>
              <div className="text-2xl font-semibold mt-1">{agent.downloads}</div>
            </div>
            <div className="border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">最近更新</div>
              <div className="text-2xl font-semibold mt-1">{agent.updatedAt}</div>
            </div>
          </div>

          {/* Skills & MCP */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-border rounded-lg p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3">
                <Cpu className="w-4 h-4 text-primary" />
                挂载的 Skill
              </h3>
              {skillDetails.length > 0 ? (
                <div className="space-y-2">
                  {skillDetails.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-2 bg-secondary rounded">
                      <span>{s.name}</span>
                      {s.description && <span className="text-xs text-muted-foreground">{s.description}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">暂无挂载</p>
              )}
            </div>
            <div className="border border-border rounded-lg p-4">
              <h3 className="font-medium flex items-center gap-2 mb-3">
                <Server className="w-4 h-4 text-primary" />
                挂载的 MCP 服务器
              </h3>
              {mcpDetails.length > 0 ? (
                <div className="space-y-2">
                  {mcpDetails.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-2 bg-secondary rounded">
                      <span>{s.name}</span>
                      {s.description && <span className="text-xs text-muted-foreground">{s.description}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">暂无挂载</p>
              )}
            </div>
          </div>

          {/* Agent MD content preview */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">agent.md 内容</h3>
              <div className="flex gap-1 text-sm">
                <button className="px-3 py-1 rounded bg-primary text-primary-foreground">中</button>
                <button className="px-3 py-1 rounded text-muted-foreground hover:bg-secondary">英</button>
              </div>
            </div>
            <div className="prose prose-sm max-w-none text-foreground">
              <p className="text-muted-foreground">
                # {agent.name}<br/><br/>
                {agent.description}<br/><br/>
                该智能体基于 Claude Managed Agents 技术，采用自主 Agent 模式，用户只需给出目标，Agent 自行决定调用哪些工具完成任务。
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Runtime Tab */}
        <TabsContent value="runtime" className="mt-4 space-y-4">
          {/* Container & metrics */}
          <div className="grid grid-cols-4 gap-3">
            <div className="border border-border rounded-lg p-4 bg-card">
              <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">容器状态</span><Container className="w-4 h-4 text-green-500" /></div>
              <div className="text-base font-semibold mt-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />运行中
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">3 个实例</div>
            </div>
            <div className="border border-border rounded-lg p-4 bg-card">
              <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">CPU 使用率</span><TrendingUp className="w-4 h-4 text-primary" /></div>
              <div className="text-base font-semibold mt-1.5">38%</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">最近 5 分钟</div>
            </div>
            <div className="border border-border rounded-lg p-4 bg-card">
              <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">内存</span><TrendingUp className="w-4 h-4 text-primary" /></div>
              <div className="text-base font-semibold mt-1.5">512MB</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">/ 1024MB</div>
            </div>
            <div className="border border-border rounded-lg p-4 bg-card">
              <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">活跃 Session</span><MessageSquare className="w-4 h-4 text-primary" /></div>
              <div className="text-base font-semibold mt-1.5">{Math.floor(agent.sessionCount / 10)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">SSE 长连接</div>
            </div>
          </div>

          {/* Active sessions list */}
          <div className="border border-border rounded-lg bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-primary" />活跃 Session</h3>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate("/sessions")}>查看全部</Button>
            </div>
            <div className="divide-y divide-border">
              {[
                { id: "sess-001", user: "廖奕通", duration: "00:12:34", status: "running" },
                { id: "sess-002", user: "张毅超", duration: "00:03:12", status: "running" },
                { id: "sess-003", user: "李四", duration: "01:24:08", status: "running" },
              ].map((s) => (
                <div key={s.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-muted-foreground">{s.id}</span>
                    <span>{s.user}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-muted-foreground">{s.duration}</span>
                    <Badge variant="outline" className="text-[10px] gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />运行中</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Logs */}
          <div className="border border-border rounded-lg bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-1.5"><ScrollText className="w-4 h-4 text-primary" />实时日志</h3>
              <Badge variant="outline" className="text-[10px]">最近 10 条</Badge>
            </div>
            <div className="p-3 font-mono text-[11px] space-y-1 max-h-64 overflow-auto bg-muted/20">
              {[
                { t: "10:24:18", lvl: "INFO", msg: "Session sess-003 created, container assigned to pod-7f8c" },
                { t: "10:24:15", lvl: "INFO", msg: "Tool call: Web Search, query=\"季度财报模板\"" },
                { t: "10:24:12", lvl: "INFO", msg: "MCP gateway: gmail_mcp.list_messages — 200 OK (124ms)" },
                { t: "10:23:58", lvl: "WARN", msg: "Rate limit close to threshold: 85/100 req/min" },
                { t: "10:23:42", lvl: "INFO", msg: "Session sess-001 resumed from snapshot" },
                { t: "10:23:18", lvl: "INFO", msg: "Container pod-7f8c health check passed" },
              ].map((l, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-muted-foreground">{l.t}</span>
                  <span className={l.lvl === "WARN" ? "text-orange-500" : "text-green-500"}>[{l.lvl}]</span>
                  <span className="text-foreground/80">{l.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
          {agent.versions.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">暂无版本记录</div>
          ) : (
            <>
              <div className="flex items-center justify-end gap-2 mb-4">
                <Button variant="outline" className="gap-1.5">
                  <Upload className="w-4 h-4" />
                  更新版本
                </Button>
                <Button variant="outline" className="gap-1.5">
                  <Download className="w-4 h-4" />
                  下载智能体
                </Button>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>版本号</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead>文件大小</TableHead>
                      <TableHead>下载数</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>创建人</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agent.versions.map((v) => (
                      <TableRow key={v.version}>
                        <TableCell className="font-medium">{v.version}</TableCell>
                        <TableCell>{v.createdAt}</TableCell>
                        <TableCell>{v.fileSize}</TableCell>
                        <TableCell>{v.downloads}</TableCell>
                        <TableCell>
                          <Badge variant={v.status === "published" ? "default" : "outline"}>
                            {v.status === "published" ? "已发布" : "未发布"}
                          </Badge>
                        </TableCell>
                        <TableCell>{v.creator}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost">下载</Button>
                            {v.status === "unpublished" ? (
                              <Button size="sm">发布广场</Button>
                            ) : (
                              <Button size="sm" variant="outline">下线广场</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgentDetail;
