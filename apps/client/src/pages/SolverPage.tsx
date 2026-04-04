import type { CustomTestCase } from "@codeshare/shared";
import { ROOM_LIMITS, SocketEvents } from "@codeshare/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { Group, Panel, type PanelImperativeHandle, Separator } from "react-resizable-panels";
import { CodeEditor } from "../components/CodeEditor.tsx";
import { ImportDialog } from "../components/ImportDialog.tsx";
import { PanelErrorBoundary } from "../components/PanelErrorBoundary.tsx";
import { ProblemPanel } from "../components/ProblemPanel.tsx";
import { ResultsPanel } from "../components/ResultsPanel.tsx";
import { SolverResultsTabs } from "../components/SolverResultsTabs.tsx";
import { SolverToolbar } from "../components/SolverToolbar.tsx";
import { TestCasePanel } from "../components/TestCasePanel.tsx";
import { useHints } from "../hooks/useHints.ts";
import { useLayoutState } from "../hooks/useLayoutState.ts";
import { useRoom } from "../hooks/useRoom.ts";
import { useSocket } from "../hooks/useSocket.ts";

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
          <PanelErrorBoundary name="Problem">
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
          </PanelErrorBoundary>
        </Panel>

        <Separator id="solver-main-separator" className="solver-resize-handle" />

        <Panel id="right-col" defaultSize={60} minSize={30}>
          <Group orientation="vertical" id="right-column">
            <Panel id="editor" defaultSize={65} minSize={25}>
              <div className="flex h-full flex-col">
                <SolverToolbar
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
                  isInterviewMode={state.mode === "interview"}
                />
                <PanelErrorBoundary name="Editor">
                  <div className="flex-1 overflow-hidden">
                    <CodeEditor readOnly={editorReadOnly} connected={connected} />
                  </div>
                </PanelErrorBoundary>
              </div>
            </Panel>

            <Separator id="solver-results-separator" className="solver-resize-handle" />

            <Panel
              id="results"
              panelRef={resultsPanelRef}
              defaultSize={35}
              minSize={15}
              collapsible
              collapsedSize={0}
            >
              <div className="flex h-full flex-col">
                <SolverResultsTabs
                  activeTab={layout.state.activeResultsTab}
                  onTabChange={layout.setActiveResultsTab}
                />
                <PanelErrorBoundary name="Results">
                  <div className="flex-1 overflow-hidden">
                    {layout.state.activeResultsTab === "testcases" ? (
                      <TestCasePanel
                        testCases={state.visibleTestCases}
                        customTestCases={state.customTestCases}
                        parameterNames={state.parameterNames}
                        onAddTestCase={handleAddTestCase}
                        canAddMore={
                          state.customTestCases.length < ROOM_LIMITS.MAX_CUSTOM_TEST_CASES
                        }
                      />
                    ) : (
                      <ResultsPanel
                        executionResult={state.executionResult}
                        executionInProgress={state.executionInProgress}
                        lastError={state.lastError}
                      />
                    )}
                  </div>
                </PanelErrorBoundary>
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
