import { type RenderOptions, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

export function renderWithRouter(
  ui: ReactElement,
  opts?: RenderOptions & { initialEntries?: string[] },
) {
  const { initialEntries = ["/"], ...renderOpts } = opts ?? {};
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>, renderOpts);
}

export function renderWithRoute(
  ui: ReactElement,
  { path, initialEntry }: { path: string; initialEntry: string },
  opts?: RenderOptions,
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path={path} element={ui} />
      </Routes>
    </MemoryRouter>,
    opts,
  );
}
