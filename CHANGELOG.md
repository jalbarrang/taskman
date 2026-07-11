# Changelog

## [0.6.0](https://github.com/jalbarrang/taskman/compare/taskman-v0.5.0...taskman-v0.6.0) (2026-07-11)


### ⚠ BREAKING CHANGES

* configurable plans root via .taskmanrc, default .taskman/plans/

### Features

* command argument autocomplete + taskman create-plan/create-handoff CLI ([4aa34b1](https://github.com/jalbarrang/taskman/commit/4aa34b10d706b78814bfc786f3b721a847633781))
* configurable plans root via .taskmanrc, default .taskman/plans/ ([2e4e292](https://github.com/jalbarrang/taskman/commit/2e4e292590635c28d5bad16147009d66e14fd2a8))
* create-initiative and revise-plan commands ([22a7d09](https://github.com/jalbarrang/taskman/commit/22a7d097e68480216a2aadd7c1eef4d869ae423f))
* **plan-mode:** file plans into external repos + drop in-memory status bar ([32f2c6c](https://github.com/jalbarrang/taskman/commit/32f2c6c60121c413c46707203128e7d63a2d7d7e))

## 0.6.0

- **BREAKING: the default ledger moved from `.plans/` to `.taskman/plans/`, with no fallback.** taskman no longer reads or writes `.plans/` unless you point it there explicitly, so it stops colliding with other workflows that use `.plans/` differently. Migrate an existing ledger with `mkdir -p .taskman && git mv .plans .taskman/plans` (plain `mv` if the ledger is gitignored), or keep the old location by adding a `.taskmanrc` with `{"plans-root": ".plans"}`.
- `.taskmanrc` support — a JSON file in the working directory with a `"plans-root"` property whose value IS the ledger folder (it contains `plans.jsonl` directly). Resolution is cwd-only by design: no walk-up, no env var, so agents can always predict which folder a command targets. A malformed file or non-string `plans-root` exits 1 with a clear message.
- New `taskman root` command (supports `--json`) prints the resolved plans root and its source (`default` or `taskmanrc`), so humans and agents can discover where the ledger lives.
- **BREAKING (library): `makePlanRuntime(root)` / `makeRuntimeLayer(root)` now take the ledger folder itself** (default `.taskman/plans`), not a working directory containing `.plans/`. Storage programs use ledger-relative paths (`plans.jsonl`, `<plan>/tasks.jsonl`). The library never reads `.taskmanrc` implicitly — call the new exported `resolveLedgerRoot(cwd?)` and pass its `root` to `makePlanRuntime` to opt in.
- `--plan` hints now accept any directory prefix (`.taskman/plans/my-plan`, `some/root/my-plan`) — normalization takes the last path segment.

## 0.5.0

- `create-initiative` — create an initiative (INITIATIVE.md + registry entry) from any harness, matching pi plan-mode ledger shape
- `revise-plan` — rewrite a plan in place (title/handoff/tasks); statuses and notes preserved for unchanged task ids; optional initiative/depends-on re-link

# @dreki-gg/taskman

## 0.4.0

### Minor Changes

- ffde28d: Plan into another project's `.plans/` and stop trusting in-memory plan status.

  - `submit_plan`, `revise_plan`, and `add_task` now accept an optional `target`
    pointing at another repo's root. When set, the plan is filed into that
    project's `.plans/` registry — handy when you're dogfooding project A, hit a
    gap in package B (which you author), and want the plan to live and later
    execute in B. Author-only: an external plan is never pinned as the current
    session's active plan, and a missing/invalid target is rejected up front.
  - The plan-mode status bar no longer renders progress counts (`📋 2/5`) or mode
    badges from in-memory state — that data drifted from disk. The agent reads
    real status from the ledger via `plan_status` instead.
  - `taskman` exposes `makeNodeFileSystemService(root)` and a `root` parameter on
    `makePlanRuntime` / `makeRuntimeLayer`, so the whole `.plans/` registry can be
    rooted at any working directory. Default behaviour (current working directory)
    is unchanged.

## 0.3.1

### Patch Changes

- Document the `create-plan` and `create-handoff` CLI commands in the taskman
  skill and README, including the "create plans from any harness" pattern
  (inline / `--*-file` / stdin payloads) and how plan setup differs from the
  deferred `add-task` follow-up flow.

## 0.3.0

### Minor Changes

- Add `taskman create-plan` and `taskman create-handoff` CLI commands so any
  external harness can create a plan (tasks.jsonl + HANDOFF.md + registry entry,
  with optional initiative linking) or write a plan's HANDOFF.md without going
  through the plan-mode extension. Handoff and task payloads can be passed inline,
  from a file, or piped on stdin.

## 0.2.2

### Patch Changes

- Fix `taskman -V` / `--version` reporting a stale hardcoded version. The CLI now
  reads the version from the shipped `package.json` at runtime, so it always
  matches the installed package.

## 0.2.1

### Patch Changes

- Ship docs + an agent skill in the package. Adds a README (the `.plans/` ledger
  contract and three durable invariants, pointing to `taskman --help` as the
  source of truth for commands/flags) and a TanStack Intent skill
  (`skills/taskman/core`) so AI coding agents on any harness auto-discover how to
  use taskman correctly — versioned with the package, not the model's training
  cutoff.

## 0.2.0

### Minor Changes

- New package: `@dreki-gg/taskman` — the plan-mode task-management engine extracted
  into a standalone, pi-independent library plus a `taskman` CLI. Drive the same
  `.plans/` JSONL ledger (plans, initiatives, tasks, status projection/reconcile)
  from any Node harness: `taskman status`, `list`, `initiatives`,
  `initiative-status`, `update-task`, `add-task`, `reconcile`, `close`, and
  `close-initiative` — human output by default, `--json` for machines.
