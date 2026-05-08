import { useSyncExternalStore } from "react";
import { getConfiguredMcps, subscribeMcpStore } from "@/data/mcpCredentialStore";

export const useConfiguredMcps = () =>
  useSyncExternalStore(
    (cb) => {
      const u = subscribeMcpStore(cb);
      return () => { u; };
    },
    () => getConfiguredMcps().join("|"),
    () => "",
  );
