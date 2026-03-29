type ResultsTab = "testcases" | "results";

interface SolverResultsTabsProps {
  activeTab: ResultsTab;
  onTabChange: (tab: ResultsTab) => void;
}

const TABS: Array<{ key: ResultsTab; label: string }> = [
  { key: "testcases", label: "Test Cases" },
  { key: "results", label: "Results" },
];

export function SolverResultsTabs({ activeTab, onTabChange }: SolverResultsTabsProps) {
  return (
    <div className="flex min-h-11 shrink-0 items-center border-b border-[var(--color-border-subtle)] px-2">
      {TABS.map((tab) => (
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
