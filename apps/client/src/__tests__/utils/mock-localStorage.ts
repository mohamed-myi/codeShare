import { vi } from "vitest";

export function createMockLocalStorage() {
  const store = new Map<string, string>();

  return {
    store,
    mock: {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => store.set(key, value)),
      removeItem: vi.fn((key: string) => store.delete(key)),
      clear: vi.fn(() => store.clear()),
      get length() {
        return store.size;
      },
      key: vi.fn((index: number) => [...store.keys()][index] ?? null),
    },
  };
}
