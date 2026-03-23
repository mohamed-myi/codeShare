import type { CustomTestCase } from "@codeshare/shared";
import { ROOM_LIMITS, SocketEvents } from "@codeshare/shared";
import {
  CheckCircle,
  Download,
  Eye,
  PanelBottomClose,
  PanelBottomOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Group, Panel, type PanelImperativeHandle, Separator } from "react-resizable-panels";
import { CodeEditor } from "../components/CodeEditor.tsx";
import { ImportDialog } from "../components/ImportDialog.tsx";
import { ProblemPanel } from "../components/ProblemPanel.tsx";
import { ResultsPanel } from "../components/ResultsPanel.tsx";
import { TestCasePanel } from "../components/TestCasePanel.tsx";
import { useHints } from "../hooks/useHints.ts";
import { useLayoutState } from "../hooks/useLayoutState.ts";
import { useRoom } from "../hooks/useRoom.ts";
import { useSocket } from "../hooks/useSocket.ts";

type ResultsTab = "testcases" | "results";

export function SolverPage() {
  const { state } = useRoom();
  const { socket, connected } = useSocket();
  const { requestHint, approveHint, denyHint } = useHints();
  const layout = useLayoutState();
  const [showImportDialog, setShowImportDialog] = useState(false);

  const problemPanelRef = useRef<PanelImperativeHandle>(null);
  const resultsPanelRef = useRef<PanelImperativeHandle>(null);

  const currentUser = state.users.find((u) => u.id === state.currentUserId);
  const isCandidate = currentUser?.role === "candidate";
  const importDisabled = state.executionInProgress || state.isHintStreaming;
  const editorReadOnly = !state.problemId || !connected;
  const actionsDisabled = state.executionInProgress || !state.problemId || !connected;
  const canRevealSolution = state.mode === "interview" && currentUser?.role === "interviewer";
  const canImport = state.mode === "collaboration" || currentUser?.role === "interviewer";
  const problemEmptyMessage =
    isCandidate && state.mode === "interview"
      ? "Waiting for the interviewer to select a problem."
      : "Select a problem to begin.";

  useEffect(() => {
    if (state.importStatus?.status === "saved") {
      setShowImportDialog(false);
    }
  }, [state.importStatus]);

  // Auto-switch to results tab when execution starts
  useEffect(() => {
    if (state.executionInProgress) {
      layout.setActiveResultsTab("results");
    }
  }, [state.executionInProgress, layout.setActiveResultsTab]);

  const handleRun = useCallback(() => {
    if (resultsPanelRef.current?.isCollapsed()) {
      resultsPanelRef.current.expand();
      layout.expandResultsPanel();
    }
    layout.setActiveResultsTab("results");
    socket?.emit(SocketEvents.CODE_RUN);
  }, [socket, layout]);

  const handleSubmit = useCallback(() => {
    if (resultsPanelRef.current?.isCollapsed()) {
      resultsPanelRef.current.expand();
      layout.expandResultsPanel();
    }
    layout.setActiveResultsTab("results");
    socket?.emit(SocketEvents.CODE_SUBMIT);
  }, [socket, layout]);

  const handleAddTestCase = useCallback(
    (testCase: CustomTestCase) => {
      socket?.emit(SocketEvents.TESTCASE_ADD, testCase);
    },
    [socket],
  );

  const handleRequestHint = useCallback(() => {
    if (state.executionInProgress) return;
    requestHint();
  }, [requestHint, state.executionInProgress]);

  const handleRevealSolution = useCallback(() => {
    socket?.emit(SocketEvents.SOLUTION_REVEAL);
  }, [socket]);

  const handleImportProblem = useCallback(
    (leetcodeUrl: string) => {
      if (importDisabled) return;
      socket?.emit(SocketEvents.PROBLEM_IMPORT, { leetcodeUrl });
    },
    [importDisabled, socket],
  );

  const handleToggleProblemPanel = useCallback(() => {
    const panel = problemPanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      panel.expand();
    } else {
      panel.collapse();
    }
    layout.toggleProblemPanel();
  }, [layout]);

  const handleToggleResultsPanel = useCallback(() => {
    const panel = resultsPanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      panel.expand();
    } else {
      panel.collapse();
    }
    layout.toggleResultsPanel();
  }, [layout]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden" data-testid="solver-page">
      <Group orientation="horizontal" id="solver-layout">
        <Panel
          id="problem"
          panelRef={problemPanelRef}
          defaultSize={40}
          minSize={20}
          collapsible
          collapsedSize={0}
        >
          <div className="flex h-full flex-col overflow-y-auto">
            <ProblemPanel
              problem={state.currentProblem}
              emptyMessage={problemEmptyMessage}
              hint={
                state.problemId
                  ? {
                      hintsUsed: state.hintsUsed,
                      hintLimit: state.hintLimit,
                      pendingHintRequest: state.pendingHintRequest,
                      isHintStreaming: state.isHintStreaming,
                      executionInProgress: state.executionInProgress,
                      hintText: state.hintText,
                      currentUserId: state.currentUserId,
                      mode: state.mode,
                      onRequestHint: handleRequestHint,
                      onApproveHint: approveHint,
                      onDenyHint: denyHint,
                    }
                  : undefined
              }
            />
            {state.solution && (
              <section
                className="border-t border-[var(--color-border-subtle)] px-6 py-5"
                data-testid="solution-panel"
              >
                <h3 className="text-xs uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
                  Solution
                </h3>
                <div className="mt-3 whitespace-pre-wrap border-l border-[var(--color-border-subtle)] pl-4 font-[var(--font-family-mono)] text-sm leading-6 text-[var(--color-text-secondary)]">
                  {state.solution}
                </div>
              </section>
            )}
          </div>
        </Panel>

        <Separator />

        <Panel id="right-col" defaultSize={60} minSize={30}>
          <Group orientation="vertical" id="right-column">
            <Panel id="editor" defaultSize={65} minSize={25}>
              <div className="flex h-full flex-col">
                <EditorToolbar
                  onRun={handleRun}
                  onSubmit={handleSubmit}
                  onRevealSolution={handleRevealSolution}
                  onOpenImport={() => setShowImportDialog(true)}
                  onToggleProblemPanel={handleToggleProblemPanel}
                  onToggleResultsPanel={handleToggleResultsPanel}
                  actionsDisabled={actionsDisabled}
                  importDisabled={importDisabled}
                  solutionAvailable={Boolean(state.currentProblem?.solution)}
                  connected={connected}
                  canImport={canImport}
                  canRevealSolution={canRevealSolution}
                  problemCollapsed={layout.state.problemCollapsed}
                  resultsCollapsed={layout.state.resultsCollapsed}
                />
                <div className="flex-1 overflow-hidden">
                  <CodeEditor readOnly={editorReadOnly} />
                </div>
              </div>
            </Panel>

            <Separator />

            <Panel
              id="results"
              panelRef={resultsPanelRef}
              defaultSize={35}
              minSize={15}
              collapsible
              collapsedSize={0}
            >
              <div className="flex h-full flex-col">
                <ResultsTabs
                  activeTab={layout.state.activeResultsTab}
                  onTabChange={layout.setActiveResultsTab}
                />
                <div className="flex-1 overflow-hidden">
                  {layout.state.activeResultsTab === "testcases" ? (
                    <TestCasePanel
                      testCases={state.visibleTestCases}
                      customTestCases={state.customTestCases}
                      parameterNames={state.parameterNames}
                      onAddTestCase={handleAddTestCase}
                      canAddMore={state.customTestCases.length < ROOM_LIMITS.MAX_CUSTOM_TEST_CASES}
                    />
                  ) : (
                    <ResultsPanel
                      executionResult={state.executionResult}
                      executionInProgress={state.executionInProgress}
                      lastError={state.lastError}
                    />
                  )}
                </div>
              </div>
            </Panel>
          </Group>
        </Panel>
      </Group>

      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onSubmit={handleImportProblem}
        importStatus={state.importStatus}
        disabledReason={importDisabled ? "Import is unavailable while code is running." : null}
      />
    </div>
  );
}

// --- EditorToolbar (inline, not a separate file) ---

interface EditorToolbarProps {
  onRun: () => void;
  onSubmit: () => void;
  onRevealSolution: () => void;
  onOpenImport: () => void;
  onToggleProblemPanel: () => void;
  onToggleResultsPanel: () => void;
  actionsDisabled: boolean;
  importDisabled: boolean;
  solutionAvailable: boolean;
  connected: boolean;
  canImport: boolean;
  canRevealSolution: boolean;
  problemCollapsed: boolean;
  resultsCollapsed: boolean;
}

function EditorToolbar({
  onRun,
  onSubmit,
  onRevealSolution,
  onOpenImport,
  onToggleProblemPanel,
  onToggleResultsPanel,
  actionsDisabled,
  importDisabled,
  solutionAvailable,
  connected,
  canImport,
  canRevealSolution,
  problemCollapsed,
  resultsCollapsed,
}: EditorToolbarProps) {
  return (
    <div
      className="flex h-12 shrink-0 items-center gap-4 border-b border-[var(--color-border-subtle)] px-4"
      data-testid="editor-command-bar"
    >
      <button
        type="button"
        data-testid="run-code-button"
        className="ui-ghost-button px-0 py-1.5 text-xs"
        onClick={onRun}
        disabled={actionsDisabled}
      >
        <Play size={12} />
        Run
      </button>
      <button
        type="button"
        data-testid="submit-code-button"
        className="ui-flat-button px-3 py-1.5 text-xs"
        onClick={onSubmit}
        disabled={actionsDisabled}
      >
        <CheckCircle size={12} />
        Submit
      </button>
      {canRevealSolution && (
        <button
          type="button"
          data-testid="reveal-solution-button"
          className="ui-ghost-button px-0 py-1.5 text-xs"
          onClick={onRevealSolution}
          disabled={actionsDisabled || !solutionAvailable}
          title={!solutionAvailable ? "No solution available for imported problems." : undefined}
        >
          <Eye size={12} />
          Reveal
        </button>
      )}
      {canImport && (
        <button
          type="button"
          data-testid="solver-import-button"
          className="ui-ghost-button px-0 py-1.5 text-xs"
          onClick={onOpenImport}
          disabled={importDisabled || !connected}
        >
          <Download size={12} />
          Import
        </button>
      )}

      <div className="flex-1" />

      <button
        type="button"
        onClick={onToggleProblemPanel}
        data-testid="toggle-problem-panel"
        className="text-[var(--color-text-tertiary)] transition-colors duration-[140ms] ease-in-out hover:text-[var(--color-text-primary)]"
        title={problemCollapsed ? "Show problem panel" : "Hide problem panel"}
      >
        {problemCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
      </button>
      <button
        type="button"
        onClick={onToggleResultsPanel}
        data-testid="toggle-results-panel"
        className="text-[var(--color-text-tertiary)] transition-colors duration-[140ms] ease-in-out hover:text-[var(--color-text-primary)]"
        title={resultsCollapsed ? "Show results panel" : "Hide results panel"}
      >
        {resultsCollapsed ? <PanelBottomOpen size={14} /> : <PanelBottomClose size={14} />}
      </button>
    </div>
  );
}

// --- ResultsTabs ---

interface ResultsTabsProps {
  activeTab: ResultsTab;
  onTabChange: (tab: ResultsTab) => void;
}

function ResultsTabs({ activeTab, onTabChange }: ResultsTabsProps) {
  const tabs: { key: ResultsTab; label: string }[] = [
    { key: "testcases", label: "Test Cases" },
    { key: "results", label: "Results" },
  ];

  return (
    <div className="flex min-h-11 shrink-0 items-center border-b border-[var(--color-border-subtle)] px-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          data-testid={`results-tab-${tab.key}`}
          onClick={() => onTabChange(tab.key)}
          className={`px-3 py-3 text-xs transition-colors duration-[140ms] ease-in-out ${
            activeTab === tab.key
              ? "border-b border-b-white/70 text-[var(--color-text-primary)]"
              : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
