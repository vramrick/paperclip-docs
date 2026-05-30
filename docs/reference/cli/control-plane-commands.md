---
paperclip_version: v2026.529.0
---

# Control-Plane Commands

Use these commands when Paperclip is already running and you want to operate a company from the terminal instead of the UI.

This section covers the commands that most directly affect company work:

- issues and comments
- companies and portability
- agents and local agent setup
- approvals
- activity and dashboard reads
- manual heartbeat invocation

---

## Working Pattern

The terminal workflow is usually:

1. choose or set a company context
2. inspect the current state
3. make a targeted change
4. verify the result in the follow-up command or the UI

> **Tip:** Use `--json` when you are scripting against the CLI or piping results into another tool.

---

## Company Commands

Use these commands to inspect companies, export data, import portable packages, or delete a company when the server allows it.

```sh
pnpm paperclipai company list
pnpm paperclipai company get <company-id>
pnpm paperclipai company export <company-id> --out ./exports/acme --include company,agents
pnpm paperclipai company import ./exports/acme --target new --new-company-name "Acme Imported" --include company,agents
pnpm paperclipai company delete <company-id-or-prefix> --yes --confirm <same-id-or-prefix>
```

Practical notes:

- export writes a portable package that includes a manifest and markdown-backed content
- import can target a new company or update an existing one
- use `--dry-run` when you want to preview an import without writing anything
- deletion is guarded by server-side policy and confirmation flags

> **Warning:** `company delete` is intentionally hard to run by accident. Use the exact confirmation value the command asks for.

---

## Issue Commands

Use these commands to manage tasks directly from the shell.

```sh
pnpm paperclipai issue list --company-id <company-id> --status todo,in_progress --assignee-agent-id <agent-id> --match text
pnpm paperclipai issue get <issue-id-or-identifier>
pnpm paperclipai issue create --company-id <company-id> --title "..." --description "..." --status todo --priority high
pnpm paperclipai issue update <issue-id> --status in_progress --comment "Started triage"
pnpm paperclipai issue comment <issue-id> --body "..." --reopen
pnpm paperclipai issue checkout <issue-id> --agent-id <agent-id>
pnpm paperclipai issue release <issue-id>
```

When to use them:

- `list` to find work by status, assignee, or text match
- `get` to inspect one task in detail
- `create` when a board operator or automation needs to create work explicitly
- `update` and `comment` when you want to move or annotate a task without opening the UI
- `checkout` and `release` when you are coordinating single-assignee work

> **Note:** `issue checkout` is the command that enforces the single-assignee task model at the CLI layer.

---

## Agent Commands

Use these commands to inspect agents or prepare a local agent CLI session.

```sh
pnpm paperclipai agent list --company-id <company-id>
pnpm paperclipai agent get <agent-id>
pnpm paperclipai agent local-cli <agent-id-or-shortname> --company-id <company-id>
```

`agent local-cli` is the practical manual path for running Claude or Codex as a Paperclip agent. It can:

- create a long-lived agent API key
- install Paperclip skills into the local Claude/Codex skills directories
- print the shell exports needed to run as that agent identity

Example:

```sh
pnpm paperclipai agent local-cli codexcoder --company-id <company-id>
pnpm paperclipai agent local-cli claudecoder --company-id <company-id>
```

---

## Skills Commands

Use these commands when you want to browse the catalog of skills that ship with the app, stock your company's skill library, keep those skills current, and decide which skills each agent should use — all from the terminal.

It helps to think in three layers:

- The **catalog** is the read-only set of app-shipped skills (`browse`, `search`, `inspect`). You install one into your company when you want it.
- The **company skill library** is your company's own collection (`list`, `show`, `file`, `import`, `create`, `check`, `update`, `audit`, `reset`, `remove`). Installing a catalog skill copies it here; you can also import or author your own.
- **Agent sync** is the desired-skill set for a single agent (`agent list`, `agent sync`, `agent clear`). Putting a skill in the library does not attach it to anyone — you sync it onto an agent when you want that agent to use it.

### Browse and install from the catalog

Start by exploring what the app ships, then install the ones you want into your company library.

```sh
pnpm paperclipai skills browse --kind bundled --category coding
pnpm paperclipai skills search "code review" --kind optional
pnpm paperclipai skills inspect <catalog-ref>
pnpm paperclipai skills install <catalog-ref> --as my-reviewer --company-id <company-id>
```

`browse` filters by `--kind` (`bundled` or `optional`), `--category`, and `--query`; `search <query>` is the same filtered list with the text supplied as an argument. `inspect <catalogRef>` shows the full detail (files, hashes, recommended roles) before you commit. `install <catalogRef>` copies the skill into the company library — use `--as <slug>` to override the slug and `--force` to replace a same-key catalog-managed skill when the server allows it.

> **Note:** `install` does **not** attach the skill to any agent. It only adds it to the library. Attach it later with `skills agent sync`.

### Work with the company skill library

Once skills are in the library, inspect them, bring in your own, and keep everything up to date.

```sh
pnpm paperclipai skills list --company-id <company-id>
pnpm paperclipai skills show <skill-ref>
pnpm paperclipai skills file <skill-ref> --path SKILL.md
pnpm paperclipai skills import <source>
pnpm paperclipai skills create --name "House Style" --slug house-style --body-file ./house-style.md
```

`import <source>` accepts a local path, a GitHub repo, a skills.sh reference, or a URL. `create` authors a managed local skill; pass the markdown body with `--body-file <path>`, or use `--body-file -` to read it from stdin.

To keep library skills current, check for updates, then install them:

```sh
pnpm paperclipai skills check
pnpm paperclipai skills update <skill-ref>
pnpm paperclipai skills update --all
pnpm paperclipai skills audit <skill-ref>
pnpm paperclipai skills reset <skill-ref> --yes
pnpm paperclipai skills remove <skill-ref> --yes
```

`check [skillRef]` reports update status (omit the reference to check every skill). `update` installs an available update for one skill, or `--all` for every skill that has one. `audit` inspects installed skill bytes without executing them. `reset` returns a catalog-managed skill to its pinned installed origin, and `remove` deletes a skill from the library — both prompt for confirmation unless you pass `--yes`. `update`, `reset`, and `audit` accept `--force` to discard local-modification or soft-audit holds (hard-stop audit findings still fail).

### Sync skills to an agent

When you want an agent to actually use library skills, sync them onto that agent.

```sh
pnpm paperclipai skills agent list <agent-ref>
pnpm paperclipai skills agent sync <agent-ref> --skill <skill-ref> --skill <other-skill-ref>
pnpm paperclipai skills agent clear <agent-ref> --yes
```

`agent list` shows the agent's current runtime skill snapshot. `agent sync` replaces the agent's non-required desired company skills with the ones you pass (repeat `--skill` for each). `agent clear` removes all non-required desired skills; required Paperclip skills stay server-enforced either way.

All company-scoped skills subcommands accept the common client options (`--company-id`, `--api-base`, `--api-key`, `--json`, and the rest). The catalog read commands (`browse`, `search`, `inspect`) are not company-scoped. See the [Command Reference](./commands.md#skills) for the exhaustive per-flag list.

---

## Approval Commands

Use these commands to review or resolve board-gated actions.

```sh
pnpm paperclipai approval list --company-id <company-id> --status pending
pnpm paperclipai approval get <approval-id>
pnpm paperclipai approval create --company-id <company-id> --type hire_agent --payload '{"name":"..."}' --issue-ids <id1,id2>
pnpm paperclipai approval approve <approval-id> --decision-note "..."
pnpm paperclipai approval reject <approval-id> --decision-note "..."
pnpm paperclipai approval request-revision <approval-id> --decision-note "..."
pnpm paperclipai approval resubmit <approval-id> --payload '{"...":"..."}'
pnpm paperclipai approval comment <approval-id> --body "..."
```

Use these when an agent needs human approval for hiring, strategy, or another governed action.

> **Tip:** A short decision note is usually enough. What matters most is that the requester can act on your feedback without guessing.

---

## Activity And Dashboard

These commands are read-only and useful for monitoring.

```sh
pnpm paperclipai activity list --company-id <company-id> --agent-id <agent-id> --entity-type issue --entity-id <id>
pnpm paperclipai dashboard get --company-id <company-id>
```

Use `activity list` when you want the audit trail for a company or object. Use `dashboard get` when you want the same top-level state the UI shows.

---

## Heartbeat

Use the heartbeat command when you want to invoke an agent directly from the terminal.

```sh
pnpm paperclipai heartbeat run --agent-id <agent-id> --api-base http://localhost:3100 --api-key <token>
```

This is most useful for debugging or for scripted agent workflows where you want a run to fire immediately instead of waiting for the normal scheduler.

---

## Next Steps

- [Setup Commands](./setup-commands.md) if you need to repair or reconfigure the local instance before using the control plane
- [Managing Tasks](../../guides/day-to-day/issues.md) for the UI workflow that mirrors the `issue` commands
- [Approvals](../../guides/day-to-day/approvals.md) for the board review flow behind the approval commands
