import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import AgentMarketplace from "./pages/AgentMarketplace";
import AgentDetail from "./pages/AgentDetail";
import ChatPage from "./pages/ChatPage";
import SessionList from "./pages/SessionList";
import VaultPage from "./pages/VaultPage";
import WorkspacePage from "./pages/WorkspacePage";
import ProjectAgents from "./pages/ProjectAgents";
import CreateAgentPage from "./pages/CreateAgentPage";
import CreatePage from "./pages/CreatePage";
import CreateWebPage from "./pages/CreateWebPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout><AgentMarketplace /></AppLayout>} />
          <Route path="/agent/:id" element={<AppLayout><AgentDetail /></AppLayout>} />
          <Route path="/chat/:id" element={<AppLayout><ChatPage /></AppLayout>} />
          <Route path="/sessions" element={<AppLayout><SessionList /></AppLayout>} />
          <Route path="/vault" element={<AppLayout><VaultPage /></AppLayout>} />
          <Route path="/workspace" element={<AppLayout><WorkspacePage /></AppLayout>} />
          <Route path="/project-agents" element={<AppLayout><ProjectAgents /></AppLayout>} />
          <Route path="/create" element={<AppLayout><CreatePage /></AppLayout>} />
          <Route path="/create-web" element={<AppLayout><CreateWebPage /></AppLayout>} />
          <Route path="/create-agent" element={<AppLayout><CreateAgentPage /></AppLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
