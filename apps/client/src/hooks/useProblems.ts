import type { ProblemListItem } from "@codeshare/shared";
import { useEffect, useState } from "react";
import { fetchProblems } from "../lib/api.ts";

export function useProblems() {
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProblems() {
      try {
        const nextProblems = await fetchProblems();
        if (!active) {
          return;
        }
        setProblems(nextProblems);
        setError(null);
      } catch (err) {
        if (!active) {
          return;
        }
        setProblems([]);
        setError(err instanceof Error ? err.message : "Failed to load problems.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProblems();

    return () => {
      active = false;
    };
  }, []);

  return { problems, loading, error };
}
