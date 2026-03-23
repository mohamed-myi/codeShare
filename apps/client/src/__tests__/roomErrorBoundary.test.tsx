import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RoomErrorBoundary } from "../components/RoomErrorBoundary.tsx";

function ThrowingChild(): null {
  throw new Error("boom");
}

describe("RoomErrorBoundary", () => {
  it("renders a fallback when the room view throws", () => {
    const originalConsoleError = console.error;
    console.error = () => {};

    try {
      render(
        <RoomErrorBoundary>
          <ThrowingChild />
        </RoomErrorBoundary>,
      );
    } finally {
      console.error = originalConsoleError;
    }

    expect(screen.getByText("Room failed to load")).toBeDefined();
  });
});
