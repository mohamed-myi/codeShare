import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImportDialog } from "../components/ImportDialog.tsx";

describe("ImportDialog", () => {
  it("submits a valid LeetCode URL", () => {
    const onSubmit = vi.fn();

    render(
      <ImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        importStatus={null}
        disabledReason={null}
      />,
    );

    fireEvent.change(screen.getByLabelText("LeetCode URL"), {
      target: { value: "https://leetcode.com/problems/two-sum/" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import Problem" }));

    expect(onSubmit).toHaveBeenCalledWith("https://leetcode.com/problems/two-sum/");
  });

  it("shows client-side validation for invalid URLs", () => {
    const onSubmit = vi.fn();

    render(
      <ImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        importStatus={null}
        disabledReason={null}
      />,
    );

    fireEvent.change(screen.getByLabelText("LeetCode URL"), {
      target: { value: "https://example.com/problems/two-sum/" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import Problem" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Paste a valid LeetCode problem URL.")).toBeDefined();
  });

  it("renders import progress and failure feedback", () => {
    const { rerender } = render(
      <ImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        importStatus={{ status: "scraping" }}
        disabledReason={null}
      />,
    );

    expect(screen.getByText("Importing from LeetCode...")).toBeDefined();
    expect(screen.getByText("Importing...").closest("button")?.disabled).toBe(true);

    rerender(
      <ImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        importStatus={{
          status: "failed",
          message: "Daily import limit reached. Please try again tomorrow.",
        }}
        disabledReason={null}
      />,
    );

    expect(
      screen.getByText("Daily import limit reached. Please try again tomorrow."),
    ).toBeDefined();
  });

  it("does not submit while imports are temporarily disabled", () => {
    const onSubmit = vi.fn();

    render(
      <ImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        importStatus={null}
        disabledReason="Import is unavailable while code is running."
      />,
    );

    fireEvent.change(screen.getByLabelText("LeetCode URL"), {
      target: { value: "https://leetcode.com/problems/two-sum/" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import Problem" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Import is unavailable while code is running.")).toBeDefined();
  });
});
