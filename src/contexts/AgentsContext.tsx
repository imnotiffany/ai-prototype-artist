import { createContext, ReactNode, useContext, useState } from "react";
import { mockAgents, type Agent } from "@/data/mockData";

interface AgentsCtx {
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
}

const AgentsContext = createContext<AgentsCtx | null>(null);

export const AgentsProvider = ({ children }: { children: ReactNode }) => {
  const [agents, setAgents] = useState<Agent[]>(mockAgents);

  return (
    <AgentsContext.Provider value={{ agents, setAgents }}>
      {children}
    </AgentsContext.Provider>
  );
};

export const useAgents = () => {
  const ctx = useContext(AgentsContext);
  if (!ctx) throw new Error("useAgents must be used within AgentsProvider");
  return ctx;
};