# codeShare

Read [docs/benchmark.md](docs/benchmark.md) when preparing a benchmark task,
changing test infrastructure, or validating the baseline. It defines the required
checks, isolated browser environment, and evidence needed before completion.

## TDD Workflow

This project follows TDD. When implementing features:
1. Write failing tests first
2. Implement code to make tests pass
3. Run the full test suite before marking any task complete
4. Always run `vitest` (for TS/React) or `go test ./...` (for Go) to verify

Use the workspace Vitest scripts through `pnpm test --force`. Rebuild shared
packages before testing dependents and run type checks across every workspace.
Test behavior at public boundaries, including invalid input and concurrency when
applicable. Investigate failures at their source; preserve existing assertions.

Stage or commit only when the user explicitly requests it.
