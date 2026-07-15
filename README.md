# @dreki-gg/taskman

A standalone task-management engine — and a `taskman` CLI — over a plain JSONL
plan ledger (default `.taskman/plans/`, configurable via `.taskmanrc`). It is
the core extracted from
[`@dreki-gg/pi-plan-mode`](../plan-mode), so any harness (not just pi) can drive
the same plans, initiatives, and tasks.

## Why it exists

Planning agents need durable, file-based task state that survives across
sessions and tools. `taskman` owns that state machine — task status, plan and
initiative lifecycle, and the projection rules that keep them consistent — with
**no dependency on any specific agent harness**. Use it from a shell, a CI job,
a different agent, or as a library.

## The ledger (the one durable contract)

Everything lives under the plans root — `.taskman/plans/` in the current
working directory by default:

- `<root>/plans.jsonl` — the plan registry.
- `<root>/initiatives.jsonl` — the initiative registry (initiatives group plans).
- `<root>/<plan>/tasks.jsonl` — one plan's task list (first line is metadata).
- `<root>/<plan>/HANDOFF.md`, `<root>/<initiative>/INITIATIVE.md` — prose docs.

### Configuring the plans root (`.taskmanrc`)

Drop a `.taskmanrc` JSON file in the working directory to relocate the ledger —
useful when another workflow already claims a similar folder:

```json
{ "plans-root": "some/dir" }
```

The value IS the ledger folder (`some/dir/plans.jsonl`, `some/dir/<plan>/`).
Resolution is cwd-only by design — no directory walk-up, no environment
variable — so you (and agents) can always predict which folder a command
targets. `taskman root` (add `--json` for machines) prints the resolved root
and whether it came from `.taskmanrc` or the default.

Three invariants are worth knowing; everything else is mechanism:

1. **Status is a projection, not a flag.** A plan is `done` when its active
   tasks are all resolved (and no follow-ups remain); an initiative is `done`
   when every member plan is terminal. Writing task state re-derives the
   registry — you do not set plan status by hand for the normal path.
2. **Plan resolution is stateless.** A command targets a plan via `--plan
   <name>` (a path prefix like `.taskman/plans/<name>` is stripped), else the
   *single* in-progress plan. Ambiguous or missing → it exits non-zero and
   lists the candidates.
3. **Terminal statuses set manually are never auto-reverted.** `reconcile` only
   moves `in-progress ⇄ done`; it never resurrects a `superseded`/`abandoned`
   plan or regresses a finished one.

## Usage

```bash
taskman --help            # full, always-current command list
taskman <command> --help  # flags + arguments for one command
```

`--help` is the source of truth for commands and flags — this README does not
duplicate it (so it cannot drift). Every command prints human text by default
and accepts `--json` for machine consumption.

Create a plan from any harness (handoff/tasks accept an inline value, a `--*-file <path>`, or piped stdin):

```bash
echo "$MARKDOWN" | taskman create-plan --name my-plan --title "My Plan" \
  --handoff-file - --tasks '[{"description":"do it"}]'
taskman create-handoff --plan my-plan --file HANDOFF.md   # write/replace prose
```

Create an initiative, then link member plans; revise a plan in place when follow-up changes arrive (omitted fields stay as-is; matching task ids keep status/notes):

```bash
taskman create-initiative --name auth-overhaul --title "Auth Overhaul" --overview-file INITIATIVE.md
taskman create-plan --name auth-api --title "Auth API" --initiative auth-overhaul \
  --handoff "..." --tasks '[{"description":"scaffold"}]'
taskman revise-plan --plan auth-api --title "Auth API v2" --tasks '[{"id":"t-001","description":"scaffold"},{"id":"t-002","description":"tests"}]'
```

A typical execution loop:

```bash
taskman status                       # what's the active plan and its tasks?
taskman update-task t-003 done       # mark progress (auto-reconciles the plan)
taskman add-task "handle empty case" --reason "found gap while implementing"
taskman reconcile --apply            # repair safe status drift
```

## MCP server

The MCP server requires Node.js 24 or newer and runs as a first-class stdio service: `taskman mcp`. Its stdout is reserved for MCP JSON-RPC; diagnostics use stderr.

Configure any MCP-capable harness to start it from the repository whose ledger it should manage:

```json
{
  "command": "taskman",
  "args": ["mcp"],
  "cwd": "/absolute/path/to/repository"
}
```

The server binds its ledger root once at startup from that `cwd`, using the repository's `.taskmanrc` when present or the default `.taskman/plans/` otherwise. Tools do not accept root or filesystem-path inputs. Every call reads the ledger fresh from disk, so changes made before a call are visible.

Version 1 exposes these eight tools:

- `taskman_status` resolves and inspects a plan, including tasks and finalizability.
- `taskman_list` lists plans or initiatives with filters and sorting.
- `taskman_create_plan` creates or replaces a plan with its handoff and tasks.
- `taskman_revise_plan` updates a plan while preserving matching task state.
- `taskman_update_task` changes one task's status and optional notes.
- `taskman_add_task` records a deferred follow-up task.
- `taskman_close` sets a plan lifecycle status.
- `taskman_reconcile` reports or safely applies status-projection repairs.

There are no MCP resources or prompts in v1. MCP is available through `taskman mcp`, not as a public MCP library export.

Mutating tool calls are serialized within one running MCP server process. That queue does not coordinate with another Taskman CLI or MCP server process, so concurrent cross-process writes can still race; v1 makes no cross-process atomicity guarantee.

## As a library

```ts
import {
  makePlanRuntime,
  resolveLedgerRoot,
  resolvePlanByName,
  setTaskStatus,
} from '@dreki-gg/taskman';

// Honour a .taskmanrc if present (the library never reads it implicitly);
// makePlanRuntime() alone uses the default root, .taskman/plans.
const run = makePlanRuntime(resolveLedgerRoot().root);
const { planDir } = await run(resolvePlanByName({ name: 'my-plan' }));
await run(setTaskStatus(planDir!, 't-001', 'done'));
```

`makePlanRuntime(root)` takes the ledger folder itself — storage programs use
ledger-relative paths, so the root places the whole registry.

The public surface (storage, schema, reconcile, initiative projection,
resolution, and composite write flows) is exported from the package root. The
engine is built on [Effect](https://effect.website) with a single `FileSystem`
seam, so it is straightforward to test and to run against an alternate backend.

## Agent skill

This package ships a [TanStack Intent](https://tanstack.com/intent) skill
(`skills/taskman/core`) — versioned guidance that AI coding agents discover from
`node_modules`. If you use an AI agent, run:

```bash
npx @tanstack/intent@latest install
```

## License

MIT

## Releasing

No changesets here — plain npm: `npm version minor && npm publish && git push --follow-tags`. Requires npm 2FA.

## Skill

The canonical agent-facing skill for this CLI lives in [jalbarrang/skills/taskman](https://github.com/jalbarrang/skills/tree/main/taskman) (`npx skills add jalbarrang/skills/taskman`). The copy under `skills/taskman/core` ships inside the npm package for pi consumers and mirrors it.
