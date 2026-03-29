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

interface SolverToolbarProps {
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
  isInterviewMode: boolean;
}

export function SolverToolbar({
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
  isInterviewMode,
}: SolverToolbarProps) {
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

      {isInterviewMode && (
        <span
          data-testid="interview-mode-badge"
          className="rounded-sm border border-[var(--color-border-subtle)] px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)]"
        >
          Interview Mode
        </span>
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
