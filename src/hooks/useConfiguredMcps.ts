import { useEffect, useState } from "react";
import { getConfiguredMcps, subscribeMcpStore } from "@/data/mcpCredentialStore";

/** Subscribe to the configured-credential MCP store. Returns names array snapshot. */
export const useConfiguredMcps = (): string[] => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = subscribeMcpStore(() => setTick((t) => t + 1));
    return () => { unsub; };
  }, []);
  return getConfiguredMcps();
};
