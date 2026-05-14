import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { TabBar } from "./TabBar";
import { TabsProvider } from "@/contexts/TabsContext";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-hidden bg-background flex flex-col min-w-0">
        <TabsProvider>
          <TabBar />
          <div className="flex-1 overflow-auto flex flex-col min-h-0">
            {children}
          </div>
        </TabsProvider>
      </main>
    </div>
  );
};
