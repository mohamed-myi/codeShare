import { useState, useEffect } from "react";
import type { ProblemListItem } from "@codeshare/shared";
import { fetchProblems } from "../lib/api.ts";

export function useProblems() {
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProblems()
      .then(setProblems)
      .finally(() => setLoading(false));
  }, []);

  return { problems, loading };
}
