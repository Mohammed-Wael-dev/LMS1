import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import useAuth from "../store/useAuth";
import { useSettings } from "./useSettings";
import { postPresence, sendPresenceBeacon } from "../services/presence";

export function useStudentPresence(courseId?: string) {
  const { isAuthenticated } = useAuth();
  const { data: settings } = useSettings();

  const intervalMs = Math.max(
    5000,
    1000 * Number(settings?.student_timer ?? 20)
  );

  const timerRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const heartbeat = useMutation({
    mutationFn: async () => {
      if (!courseId) return;
      await postPresence(courseId);
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });

  function start() {
    if (runningRef.current || !isAuthenticated || !courseId) return;
    runningRef.current = true;

    heartbeat.mutate();

    timerRef.current = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        heartbeat.mutate();
      }
    }, intervalMs) as unknown as number;
  }

  function stop(sendFinal = true) {
    runningRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (sendFinal && courseId) {
      sendPresenceBeacon(courseId);
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !courseId) return;

    start();

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        stop(false);
      } else {
        start();
      }
    };

    const onPageHide = () => stop(true);
    const onBeforeUnload = () => stop(true);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      stop(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, courseId, intervalMs]);
}
