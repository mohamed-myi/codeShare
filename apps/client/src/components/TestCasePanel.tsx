import type { CustomTestCase, TestCase } from "@codeshare/shared";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

interface TestCasePanelProps {
  testCases: TestCase[];
  customTestCases?: CustomTestCase[];
  parameterNames?: string[];
  onAddTestCase?: (testCase: CustomTestCase) => void;
  canAddMore?: boolean;
}

export function TestCasePanel({
  testCases,
  customTestCases = [],
  parameterNames = [],
  onAddTestCase,
  canAddMore = false,
}: TestCasePanelProps) {
  if (testCases.length === 0 && customTestCases.length === 0 && parameterNames.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-[var(--color-text-tertiary)]">No test cases yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto p-3" data-testid="testcases-panel">
      {testCases.length > 0 && (
        <>
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">
            Test Cases
          </h3>
          <div className="space-y-3">
            {testCases.map((tc, i) => (
              <div
                key={tc.id}
                className="rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)] p-2 text-xs"
              >
                <div className="mb-1 font-medium text-[var(--color-text-tertiary)]">
                  Case {i + 1}
                </div>
                <div className="space-y-1">
                  {Object.entries(tc.input).map(([key, value]) => (
                    <div key={key} className="flex gap-1">
                      <span className="font-medium text-[var(--color-text-tertiary)]">{key}:</span>
                      <span className="font-[var(--font-family-mono)] text-[var(--color-text-secondary)]">
                        {formatValue(value)}
                      </span>
                    </div>
                  ))}
                  <div className="flex gap-1 border-t border-[var(--color-border-subtle)] pt-1">
                    <span className="font-medium text-[var(--color-text-tertiary)]">Expected:</span>
                    <span className="font-[var(--font-family-mono)] text-[var(--color-text-secondary)]">
                      {formatValue(tc.expectedOutput)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {customTestCases.length > 0 && (
        <div className="mt-3">
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">
            Custom Test Cases
          </h3>
          <div className="space-y-3">
            {customTestCases.map((ct, i) => (
              <div
                key={i}
                className="rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-bg-tertiary)] p-2 text-xs"
              >
                <div className="mb-1 font-medium text-[var(--color-text-secondary)]">
                  Custom {i + 1}
                </div>
                <div className="space-y-1">
                  {Object.entries(ct.input).map(([key, value]) => (
                    <div key={key} className="flex gap-1">
                      <span className="font-medium text-[var(--color-text-tertiary)]">{key}:</span>
                      <span className="font-[var(--font-family-mono)] text-[var(--color-text-secondary)]">
                        {formatValue(value)}
                      </span>
                    </div>
                  ))}
                  <div className="flex gap-1 border-t border-[var(--color-border-subtle)] pt-1">
                    <span className="font-medium text-[var(--color-text-tertiary)]">Expected:</span>
                    <span className="font-[var(--font-family-mono)] text-[var(--color-text-secondary)]">
                      {formatValue(ct.expectedOutput)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {parameterNames.length > 0 && canAddMore && onAddTestCase && (
        <AddTestCaseForm parameterNames={parameterNames} onAdd={onAddTestCase} />
      )}
    </div>
  );
}

interface AddTestCaseFormProps {
  parameterNames: string[];
  onAdd: (testCase: CustomTestCase) => void;
}

function AddTestCaseForm({ parameterNames, onAdd }: AddTestCaseFormProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    buildInitialValues(parameterNames),
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setValues(buildInitialValues(parameterNames));
    setValidationError(null);
  }, [parameterNames]);

  function handleValueChange(name: string, value: string) {
    setValidationError(null);
    setValues((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: Record<string, unknown> = {};
    for (const name of parameterNames) {
      try {
        input[name] = JSON.parse(values[name]);
      } catch {
        setValidationError(`${name} must be valid JSON.`);
        return;
      }
    }
    let expectedOutput: unknown;
    try {
      expectedOutput = JSON.parse(values.__expected);
    } catch {
      setValidationError("Expected Output must be valid JSON.");
      return;
    }
    onAdd({ input, expectedOutput });
    setValidationError(null);
    setValues(buildInitialValues(parameterNames));
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="custom-testcase-form"
      className="mt-3 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border-strong)] p-2"
    >
      <h4 className="mb-2 text-xs font-semibold text-[var(--color-text-primary)]">Add Test Case</h4>
      <div className="space-y-2">
        {parameterNames.map((name) => (
          <div key={name}>
            <label
              htmlFor={`param-${name}`}
              className="block text-xs font-medium text-[var(--color-text-tertiary)]"
            >
              {name}
            </label>
            <input
              id={`param-${name}`}
              type="text"
              data-testid={`custom-input-${name}`}
              className="mt-0.5 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-bg-tertiary)] px-2 py-1 font-[var(--font-family-mono)] text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
              value={values[name] ?? ""}
              onChange={(e) => handleValueChange(name, e.target.value)}
              placeholder={`JSON value for ${name}`}
            />
          </div>
        ))}
        <div>
          <label
            htmlFor="expected-output"
            className="block text-xs font-medium text-[var(--color-text-tertiary)]"
          >
            Expected Output
          </label>
          <input
            id="expected-output"
            type="text"
            data-testid="custom-expected-output"
            className="mt-0.5 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-bg-tertiary)] px-2 py-1 font-[var(--font-family-mono)] text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
            value={values.__expected ?? ""}
            onChange={(e) => handleValueChange("__expected", e.target.value)}
            placeholder="JSON expected output"
          />
        </div>
      </div>
      {validationError && (
        <p className="mt-2 text-xs text-[var(--color-error-text)]" role="alert">
          {validationError}
        </p>
      )}
      <button
        type="submit"
        data-testid="add-custom-testcase-button"
        className="mt-2 inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-1 text-xs text-white transition-colors duration-[var(--transition-fast)] hover:bg-[var(--color-accent-hover)]"
      >
        <Plus size={12} />
        Add
      </button>
    </form>
  );
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  return JSON.stringify(value);
}

function buildInitialValues(parameterNames: string[]): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const name of parameterNames) {
    initial[name] = "";
  }
  initial.__expected = "";
  return initial;
}
