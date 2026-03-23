import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  size?: "default" | "compact";
  disabled?: boolean;
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  className = "",
  size = "default",
  disabled = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const listboxId = `${id}-listbox`;

  const hasPlaceholder = !!placeholder;
  const minIndex = hasPlaceholder ? -1 : 0;
  const maxIndex = options.length - 1;

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption?.label ?? placeholder ?? "";
  const isPlaceholder = !selectedOption;

  const close = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
  }, []);

  const open = useCallback(() => {
    if (disabled) return;
    const idx = options.findIndex((o) => o.value === value);
    setFocusedIndex(idx >= 0 ? idx : minIndex);
    setIsOpen(true);
  }, [options, value, disabled, minIndex]);

  const selectOption = useCallback(
    (opt: SelectOption) => {
      onChange(opt.value);
      close();
      containerRef.current?.querySelector<HTMLButtonElement>("[role=combobox]")?.focus();
    },
    [onChange, close],
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, close]);

  useEffect(() => {
    if (!isOpen || !listboxRef.current) return;
    const childIndex = hasPlaceholder ? focusedIndex + 1 : focusedIndex;
    if (childIndex >= 0) {
      const item = listboxRef.current.children[childIndex] as HTMLElement | undefined;
      item?.scrollIntoView?.({ block: "nearest" });
    }
  }, [isOpen, focusedIndex, hasPlaceholder]);

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        if (isOpen && focusedIndex === -1 && hasPlaceholder) {
          selectOption({ value: "", label: placeholder });
        } else if (isOpen && focusedIndex >= 0) {
          selectOption(options[focusedIndex]);
        } else {
          open();
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          open();
        } else {
          setFocusedIndex((prev) => (prev >= maxIndex ? minIndex : prev + 1));
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!isOpen) {
          open();
        } else {
          setFocusedIndex((prev) => (prev <= minIndex ? maxIndex : prev - 1));
        }
        break;
      case "Escape":
        if (isOpen) {
          e.preventDefault();
          close();
        }
        break;
      case "Tab":
        if (isOpen) {
          close();
        }
        break;
      case "Home":
        if (isOpen) {
          e.preventDefault();
          setFocusedIndex(minIndex);
        }
        break;
      case "End":
        if (isOpen) {
          e.preventDefault();
          setFocusedIndex(maxIndex);
        }
        break;
    }
  }

  const sizeClasses = size === "compact" ? "text-xs" : "text-base";

  function getFocusedOptionId(): string | undefined {
    if (!isOpen) return undefined;
    if (focusedIndex === -1 && hasPlaceholder) return `${id}-option-placeholder`;
    if (focusedIndex >= 0) return `${id}-option-${focusedIndex}`;
    return undefined;
  }

  function optionClassName(isFocused: boolean, isSelected: boolean): string {
    const sizeClass = size === "compact" ? "text-xs" : "text-sm";
    const stateClass = isFocused
      ? "bg-[var(--color-hover-overlay)] text-[var(--color-text-primary)]"
      : isSelected
        ? "bg-[var(--color-accent-subtle)] text-[var(--color-text-primary)]"
        : "text-[var(--color-text-secondary)]";
    return `cursor-pointer truncate px-3 py-2 transition-colors duration-[140ms] ${sizeClass} ${stateClass}`;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-activedescendant={getFocusedOptionId()}
        aria-label={ariaLabel}
        disabled={disabled}
        onKeyDown={handleTriggerKeyDown}
        onClick={() => (isOpen ? close() : open())}
        className={`ui-line-control ui-select-control flex w-full cursor-pointer items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed ${sizeClasses} ${
          isPlaceholder ? "text-[var(--color-text-secondary)]" : ""
        } ${className}`}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          size={size === "compact" ? 12 : 16}
          className={`shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-[140ms] ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="ui-select-menu absolute left-0 z-30 mt-1 w-full"
        >
          {placeholder && (
            // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard nav handled on trigger button
            <div
              id={`${id}-option-placeholder`}
              role="option"
              tabIndex={-1}
              aria-selected={value === ""}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectOption({ value: "", label: placeholder })}
              onMouseEnter={() => setFocusedIndex(-1)}
              className={optionClassName(focusedIndex === -1, value === "")}
            >
              {placeholder}
            </div>
          )}
          {options.map((opt, i) => (
            // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard nav handled on trigger button
            <div
              key={opt.value}
              id={`${id}-option-${i}`}
              role="option"
              tabIndex={-1}
              aria-selected={opt.value === value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectOption(opt)}
              onMouseEnter={() => setFocusedIndex(i)}
              className={optionClassName(focusedIndex === i, opt.value === value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
