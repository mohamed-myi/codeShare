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
    <div className="overflow-y-auto px-4 py-5" data-testid="testcases-panel">
      {testCases.length > 0 && (
        <>
          <h3 className="mb-3 text-xs uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
            Test Cases
          </h3>
          <div className="space-y-4">
            {testCases.map((tc, i) => (
              <div
                key={tc.id}
                className="border-l border-[var(--color-border-subtle)] pl-4 text-xs"
              >
                <div className="mb-2 text-[var(--color-text-tertiary)]">Case {i + 1}</div>
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
          <h3 className="mb-3 text-xs uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
            Custom Test Cases
          </h3>
          <div className="space-y-4">
            {customTestCases.map((ct, i) => (
              <div
                key={JSON.stringify(ct.input)}
                className="border-l border-[var(--color-border-subtle)] pl-4 text-xs"
              >
                <div className="mb-2 text-[var(--color-text-secondary)]">Custom {i + 1}</div>
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
      className="mt-6 border-t border-dashed border-[var(--color-border-strong)] pt-4"
    >
      <h4 className="mb-3 text-xs uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">
        Add Test Case
      </h4>
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
              className="ui-line-control mt-1 font-[var(--font-family-mono)] text-xs"
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
            className="ui-line-control mt-1 font-[var(--font-family-mono)] text-xs"
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
        className="ui-flat-button mt-3 px-3 py-1.5 text-xs"
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
