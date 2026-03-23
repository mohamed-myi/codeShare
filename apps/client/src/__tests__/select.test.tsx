import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectOption } from "../components/Select.tsx";
import { Select } from "../components/Select.tsx";

const OPTIONS: SelectOption[] = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];

describe("Select", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  it("renders trigger with placeholder when value is empty", () => {
    render(<Select value="" onChange={onChange} options={OPTIONS} placeholder="Pick one" />);
    const trigger = screen.getByRole("combobox");
    expect(trigger.textContent).toContain("Pick one");
  });

  it("renders trigger with selected option label", () => {
    render(<Select value="b" onChange={onChange} options={OPTIONS} />);
    const trigger = screen.getByRole("combobox");
    expect(trigger.textContent).toContain("Beta");
  });

  it("opens dropdown on click and closes on second click", () => {
    render(<Select value="a" onChange={onChange} options={OPTIONS} />);
    const trigger = screen.getByRole("combobox");

    expect(screen.queryByRole("listbox")).toBeNull();

    fireEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeDefined();

    fireEvent.click(trigger);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("selects option and calls onChange", () => {
    render(<Select value="a" onChange={onChange} options={OPTIONS} />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Gamma" }));

    expect(onChange).toHaveBeenCalledWith("c");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("navigates with arrow keys and selects with Enter", () => {
    render(<Select value="" onChange={onChange} options={OPTIONS} placeholder="Pick" />);
    const trigger = screen.getByRole("combobox");

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeDefined();

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("closes dropdown on Escape", () => {
    render(<Select value="a" onChange={onChange} options={OPTIONS} />);
    const trigger = screen.getByRole("combobox");

    fireEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeDefined();

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("closes dropdown on click outside", () => {
    render(
      <div>
        <Select value="a" onChange={onChange} options={OPTIONS} />
        <button type="button">Outside</button>
      </div>,
    );
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeDefined();

    fireEvent.mouseDown(screen.getByText("Outside"));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("applies compact size variant", () => {
    render(<Select value="a" onChange={onChange} options={OPTIONS} size="compact" />);
    const trigger = screen.getByRole("combobox");
    expect(trigger.className).toContain("text-xs");
  });

  it("sets aria-expanded correctly", () => {
    render(<Select value="a" onChange={onChange} options={OPTIONS} />);
    const trigger = screen.getByRole("combobox");

    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("supports Home and End keys", () => {
    render(<Select value="" onChange={onChange} options={OPTIONS} placeholder="Pick" />);
    const trigger = screen.getByRole("combobox");

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "End" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("c");
  });

  it("wraps around with arrow keys through placeholder", () => {
    render(<Select value="" onChange={onChange} options={OPTIONS} placeholder="Pick" />);
    const trigger = screen.getByRole("combobox");

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    // Open, focused on placeholder (-1)
    fireEvent.keyDown(trigger, { key: "ArrowUp" });
    // Should wrap to last option (Gamma)
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("c");
  });

  it("selects placeholder option to clear value", () => {
    render(<Select value="a" onChange={onChange} options={OPTIONS} placeholder="All" />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("All"));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("opens with Space key", () => {
    render(<Select value="a" onChange={onChange} options={OPTIONS} />);
    const trigger = screen.getByRole("combobox");

    fireEvent.keyDown(trigger, { key: " " });
    expect(screen.getByRole("listbox")).toBeDefined();
  });

  it("does not open when disabled", () => {
    render(<Select value="a" onChange={onChange} options={OPTIONS} disabled />);
    const trigger = screen.getByRole("combobox");

    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("does not open via keyboard when disabled", () => {
    render(<Select value="a" onChange={onChange} options={OPTIONS} disabled />);
    const trigger = screen.getByRole("combobox");

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("selects placeholder via keyboard with Enter when focused", () => {
    render(<Select value="a" onChange={onChange} options={OPTIONS} placeholder="All" />);
    const trigger = screen.getByRole("combobox");

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    // Open, focused on currently selected "a" (index 0)
    fireEvent.keyDown(trigger, { key: "Home" });
    // Home goes to placeholder (-1)
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("gives focused style precedence over selected style", () => {
    render(<Select value="a" onChange={onChange} options={OPTIONS} />);
    const trigger = screen.getByRole("combobox");

    fireEvent.click(trigger);
    // "Alpha" (value="a") is selected, and should be focused
    const alphaOption = screen.getByRole("option", { name: "Alpha" });
    expect(alphaOption.className).toContain("bg-[var(--color-hover-overlay)]");

    // Move focus to Beta
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    // Alpha should now show selected style, not focused
    expect(alphaOption.className).toContain("bg-[var(--color-accent-subtle)]");
    expect(alphaOption.className).not.toContain("bg-[var(--color-hover-overlay)]");
  });
});
