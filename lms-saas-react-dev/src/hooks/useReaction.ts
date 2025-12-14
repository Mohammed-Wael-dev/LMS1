// hooks/useReaction.ts
import { useState, useRef } from "react";
import axios from "../api/config"; // your axios instance
import { API_ENDPOINTS } from "../utils/constants";

export type ReactionType = "like" | "love" | "clap";
export type Subject =
  | { kind: "question"; id: number }
  | { kind: "answer"; id: number };

type Counts = { like: number; love: number; clap: number };

export function useReaction({
  subject,
  initCounts,
  initMine = null as null | ReactionType,
}: {
  subject: Subject;
  initCounts: Counts;
  initMine?: null | ReactionType;
}) {
  const [counts, setCounts] = useState<Counts>(initCounts);
  const [my, setMy] = useState<null | ReactionType>(initMine);
  const [isPending, setPending] = useState(false);
  const inflight = useRef<Promise<any> | null>(null);

  const post = (type: ReactionType | null) => {
    const body: any = {
      type, // when null -> remove
    };
    if (subject.kind === "question") body.question = subject.id;
    else body.answer = subject.id;
    return axios.post(API_ENDPOINTS.toggleReaction, body);
  };

  const applyOptimistic = (
    prev: null | ReactionType,
    next: null | ReactionType
  ) => {
    setCounts((c) => {
      const n = { ...c };
      if (prev && prev !== next) n[prev] = Math.max(0, n[prev] - 1);
      if (next && next !== prev) n[next] = n[next] + 1;
      return n;
    });
    setMy(next);
  };

  const pick = async (next: ReactionType) => {
    if (isPending) return;
    const prev = my;
    // if clicking same type → remove
    const realNext: null | ReactionType = prev === next ? null : next;

    // optimistic update
    applyOptimistic(prev, realNext);

    try {
      setPending(true);
      inflight.current = post(realNext);
      await inflight.current;
    } catch {
      // revert on error
      applyOptimistic(realNext, prev);
    } finally {
      setPending(false);
      inflight.current = null;
    }
  };

  const toggleDefaultLike = () => pick("like");

  return { my, counts, isPending, pick, toggleDefaultLike };
}
