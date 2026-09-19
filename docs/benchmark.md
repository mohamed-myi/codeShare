# Benchmark baseline

Base revision: `f7b3fb5d326fd29138ef6542ad02a428ed83483c`.
Create benchmark tasks from the reviewed baseline commit after these changes are
committed. Record its full SHA in the task packet; keep the task's failing
regression tests separate from the baseline tests that must continue to pass.

## Environment and required checks

Use Node **22.21.0** (`.nvmrc`), pnpm **10.32.1** (`packageManager`), Python
**3.13.11** (`.python-version`), Docker, and the Chromium revision installed by the
locked Playwright **1.59.1** package. PostgreSQL 17 is pinned by image digest in
`scripts/e2e.mjs`. The runner supports macOS and Linux.

```bash
nvm use
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm verify:benchmark
pnpm test:stability
```

On Linux, install browser system libraries with
`pnpm exec playwright install --with-deps chromium`.
`verify:benchmark` checks prerequisites, lint, all workspace types, builds,
runner tests, uncached Vitest tests, and the local Playwright suite. Shared
packages are built before dependent workspaces. Python harness tests fail if
Python is missing; required tests must not be skipped.

`test:stability` reruns every Vitest workspace without Turbo result caching using
shuffle seeds **101–105**. The load-test workspace's Vitest tooling tests are
required. Actual load/performance runs and the opt-in `@live` provider smoke are
outside this baseline; local browser tests use HTTP stubs for Judge0, Groq, and
LeetCode. Passing the baseline does not establish real-provider correctness or
performance under load. The legacy `e2e:live` command selects the `@live` smoke
inside the same stubbed harness; its name does not imply real provider calls.

## Browser isolation

Run browser tests through `pnpm e2e`; pass Playwright filters after that command
for diagnosis. Every invocation creates a unique disposable PostgreSQL container,
random loopback ports, and an empty environment directory. It migrates and seeds
that database directly through the database workspace scripts. No developer
`.env`, Compose service, existing database, or running application is reused.

The application uses an in-memory reliability store and local provider stubs.
The runner retains only host tooling environment settings, strips application
credentials and settings, and prevents Vite from reading developer env files.
Vite's cache and browser artifacts are unique to each invocation. Browser
workers are fixed to **1**, retries to **0**, and failures retain traces and
screenshots under `test-results/codeshare-e2e-*/`.

Each test checks that application and stub resets succeed. Socket waits register
before their triggering action and release listeners/timers on completion,
timeout, or connection failure. Frontend unit tests reject unmocked HTTP traffic.

The runner removes its container and temporary state after success, failure,
SIGINT, or SIGTERM, and preserves a failing test's exit code. A cleanup failure
also fails an otherwise successful run. An uncatchable SIGKILL or host failure
can require removing the named container shown in the run log.
The runner launches Playwright directly so a package-manager wrapper cannot cut
short its signal handling. On interruption, Playwright receives SIGINT and has
up to 70 seconds to finish fixture and service teardown. Other commands also
retain their shutdown grace period when a wrapper exits before its descendants.

## Acceptance evidence

Before using a revised baseline, run the affected socket suites 20 times, all
Vitest workspaces with the five shuffle seeds, and the full local Playwright
suite three times with fresh state. Repeat `verify:benchmark` from a fresh source
snapshot with no `.env`, dependencies, generated output, or Turbo cache. Record
counts, versions, commands, and remaining coverage limits in the baseline review.

CI runs the same complete verification and shuffled stability commands. Browser
diagnostics are uploaded even when checks fail; the existing deployment workflow
continues to consume the successful CI build artifact.

### Recorded local verification — 2026-09-18

Verified on macOS with the pinned Node, pnpm, and Python versions above,
Docker **29.0.1**, Vitest **4.1.5**, and Chromium **147.0.7727.15** (revision
**1217**). These are local results; the updated GitHub Actions job has not yet run.

| Check | Result |
| --- | --- |
| Focused realtime suites, shuffle seeds 1–20 | 46 tests across 4 files passed on all 20 runs |
| `pnpm test:stability` | 842 tests across 96 files and 5 workspaces passed for each seed 101–105; no cached test results |
| `pnpm test:harness` | 18 passed, including isolation, failure, timeout, concurrency, and signal cases |
| Full local browser suite | 34 passed on three fresh runs; another 34 passed after the final runner/import fixes |
| Fresh source: `pnpm install --frozen-lockfile && pnpm verify:benchmark` | Passed prerequisite checks, lint, all workspace types, builds, 18 runner tests, 842 Vitest tests, and 34 browser tests |
| Real browser interruption with SIGINT / SIGTERM | Exit codes 130 / 143; no owned processes, listening ports, or database containers remained |

The final clean snapshot started without dependencies, generated output, Turbo
cache, or developer environment files. Only this evidence document changed after
that snapshot. The browser suite retains the original 33 local cases and adds a
cancelled-animation regression; retries and required-test skips remain disabled.

Standards review: reported process cleanup issues were fixed and verified with
both process-boundary regressions and real browser interruptions. Spec review:
the fresh execution-result acknowledgement fix retained the existing quota and
UI assertions; no further findings remained in that focused review.

## Baseline changes

The changes fix event-listener registration races, leaked socket/Yjs resources,
shared mock state exposed by shuffled execution, and browser waits that guessed
when joins, imports, editor synchronization, or animations had completed.
Cancelled transitions now count as settled without suppressing accessibility
assertions. Existing product assertions remain enabled.
The global quota scenario waits for a fresh execution result before releasing
each completed room's browser, so stale results cannot acknowledge another run.

Runner regressions cover successful runs, startup and migration failures,
readiness deadlines, failing tests, cleanup failures, concurrent invocations,
SIGINT/SIGTERM, full stderr pipes, and descendants that outlive their wrapper.
Environment tests cover credential stripping and invalid or colliding ports.

Existing integration suites retain their file layout to keep this patch focused.
The runner's lifecycle functions exceed the approximate 50-line guideline to
keep resource acquisition and guaranteed cleanup together; much of database
startup is a declarative Docker argument list.
