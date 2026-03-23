import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PanelErrorBoundary } from "../components/PanelErrorBoundary.tsx";

function ThrowingChild(): null {
  throw new Error("test crash");
}

function NormalChild() {
  return <div data-testid="normal-child">Hello</div>;
}

describe("PanelErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <PanelErrorBoundary name="Test">
        <NormalChild />
      </PanelErrorBoundary>,
    );
    expect(screen.getByTestId("normal-child")).toBeDefined();
  });

  it("renders fallback with panel name when child throws", () => {
    const originalConsoleError = console.error;
    console.error = () => {};

    try {
      render(
        <PanelErrorBoundary name="Editor">
          <ThrowingChild />
        </PanelErrorBoundary>,
      );
    } finally {
      console.error = originalConsoleError;
    }

    expect(screen.getByTestId("panel-error-editor")).toBeDefined();
    expect(screen.getByText("Editor failed to render.")).toBeDefined();
  });

  it("shows a retry button that resets the error state", () => {
    let shouldThrow = true;
    function ConditionalChild() {
      if (shouldThrow) throw new Error("conditional crash");
      return <div data-testid="recovered-child">Recovered</div>;
    }

    const originalConsoleError = console.error;
    console.error = () => {};

    try {
      render(
        <PanelErrorBoundary name="Problem">
          <ConditionalChild />
        </PanelErrorBoundary>,
      );
    } finally {
      console.error = originalConsoleError;
    }

    expect(screen.getByTestId("panel-error-problem")).toBeDefined();
    expect(screen.getByTestId("panel-retry-problem")).toBeDefined();

    shouldThrow = false;
    fireEvent.click(screen.getByTestId("panel-retry-problem"));

    expect(screen.getByTestId("recovered-child")).toBeDefined();
    expect(screen.queryByTestId("panel-error-problem")).toBeNull();
  });
});
