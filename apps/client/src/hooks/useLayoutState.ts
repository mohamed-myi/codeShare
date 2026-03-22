import { useCallback, useState } from "react";

type ResultsTab = "testcases" | "results";

interface LayoutState {
  problemCollapsed: boolean;
  resultsCollapsed: boolean;
  activeResultsTab: ResultsTab;
}

const STORAGE_KEY = "codeshare:layout";

const DEFAULT_STATE: LayoutState = {
  problemCollapsed: false,
  resultsCollapsed: false,
  activeResultsTab: "testcases",
};

function readFromStorage(): LayoutState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "problemCollapsed" in parsed &&
      "resultsCollapsed" in parsed &&
      "activeResultsTab" in parsed &&
      typeof (parsed as LayoutState).problemCollapsed === "boolean" &&
      typeof (parsed as LayoutState).resultsCollapsed === "boolean" &&
      ((parsed as LayoutState).activeResultsTab === "testcases" ||
        (parsed as LayoutState).activeResultsTab === "results")
    ) {
      return parsed as LayoutState;
    }
    return DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

function writeToStorage(state: LayoutState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // window.localStorage may be full or unavailable
  }
}

export function useLayoutState() {
  const [state, setState] = useState<LayoutState>(readFromStorage);

  const toggleProblemPanel = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, problemCollapsed: !prev.problemCollapsed };
      writeToStorage(next);
      return next;
    });
  }, []);

  const toggleResultsPanel = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, resultsCollapsed: !prev.resultsCollapsed };
      writeToStorage(next);
      return next;
    });
  }, []);

  const expandResultsPanel = useCallback(() => {
    setState((prev) => {
      if (!prev.resultsCollapsed) return prev;
      const next = { ...prev, resultsCollapsed: false };
      writeToStorage(next);
      return next;
    });
  }, []);

  const setActiveResultsTab = useCallback((tab: ResultsTab) => {
    setState((prev) => {
      if (prev.activeResultsTab === tab) return prev;
      const next = { ...prev, activeResultsTab: tab };
      writeToStorage(next);
      return next;
    });
  }, []);

  return {
    state,
    toggleProblemPanel,
    toggleResultsPanel,
    expandResultsPanel,
    setActiveResultsTab,
  };
}
