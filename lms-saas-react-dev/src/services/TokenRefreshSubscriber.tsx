import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { onTokensRefreshed } from "../services/auth";

export default function TokenRefreshSubscriber() {
  const qc = useQueryClient();

  useEffect(() => {
    const unsubscribe = onTokensRefreshed(() => {
      qc.invalidateQueries({ predicate: () => true });
    });
    return unsubscribe;
  }, [qc]);

  return null;
}
