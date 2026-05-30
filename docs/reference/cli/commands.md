---
paperclip_version: v2026.529.0
---

# Command Reference

Every `paperclipai` subcommand, every flag, every environment variable the CLI reads. This page is for lookup, not learning — if you want a guided tour, start with [Setup Commands](./setup-commands.md) or [Control-Plane Commands](./control-plane-commands.md).

> **Last verified:** 2026-04-27 against `paperclipai` **2026.325.0**. Run `paperclipai --version` to check the version on your machine. Output produced from the source `--help` text in a clean install.

---

## Synopsis

```
paperclipai <command> [subcommand] [options]
```

The binary is published as the npm package [`paperclipai`](https://www.npmjs.com/package/paperclipai). It can be invoked as:

- `paperclipai …` after a global install (`npm i -g paperclipai`)
- `npx paperclipai …` for a one-off run
- `pnpm paperclipai …` from inside the Paperclip monorepo

All three forms are equivalent. Examples on this page use the bare `paperclipai` form.

---

## Common Options

The CLI splits commands into two layers, and the option set depends on the layer.

**Local-only commands** (`onboard`, `doctor`, `env`, `configure`, `db:backup`, `allowed-hostname`, `run`, `worktree …`, `auth bootstrap-ceo`) accept only the local instance flags:

| Flag | Type | Default | Description |
|---|---|---|---|
| `-c, --config <path>` | string | resolved from `PAPERCLIP_HOME`/`PAPERCLIP_INSTANCE_ID` | Path to the instance config file. |
| `-d, --data-dir <path>` | string | `$PAPERCLIP_HOME` or `~/.paperclip` | Paperclip data directory root. Isolates state from the default install. |
| `-h, --help` | flag | — | Print help for the current command and exit. |

**Client commands** (everything that talks to the control plane: `heartbeat run`, `context …`, `company …`, `issue …`, `agent …`, `approval …`, `activity …`, `dashboard …`, `plugin …`, `auth login`/`logout`/`whoami`) accept the local flags above plus:

| Flag | Type | Default | Description |
|---|---|---|---|
| `--context <path>` | string | `$PAPERCLIP_CONTEXT` or `~/.paperclip/context.json` | Path to the CLI context file. |
| `--profile <name>` | string | active profile in the context file | Named context profile to use for this call. |
| `--api-base <url>` | string | profile / inferred from local config / `$PAPERCLIP_API_URL` | Base URL of the Paperclip server. |
| `--api-key <token>` | string | profile env var / `$PAPERCLIP_API_KEY` | Bearer token for API requests. |
| `-C, --company-id <id>` | string | profile / `$PAPERCLIP_COMPANY_ID` | Company scope (required by company-scoped commands). |
| `--json` | flag | off | Emit machine-readable JSON instead of the formatted output. |

The top-level `paperclipai --version` and `paperclipai -V` flags print the package version and exit.

---

## Setup commands

These commands shape the local install. They read and write `~/.paperclip` (or the directory chosen with `-d/--data-dir`) and do not require the server to be running.

### `paperclipai onboard`

Interactive first-run setup wizard. Writes `config.json` for the local instance and optionally starts the server.

```
paperclipai onboard [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--config <path>` | `-c` | string | — | Path to config file. |
| `--data-dir <path>` | `-d` | string | — | Paperclip data directory root. |
| `--yes` | `-y` | flag | `false` | Accept defaults (quickstart + start immediately). |
| `--run` | — | flag | `false` | Start Paperclip immediately after saving config. |
| `--help` | `-h` | flag | — | Print help and exit. |

```sh
paperclipai onboard
paperclipai onboard --yes
paperclipai onboard --run --data-dir ./tmp/paperclip-dev
```

### `paperclipai doctor`

Run diagnostic checks on the local install. Aliased as `paperclipai --fix`.

```
paperclipai doctor [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--config <path>` | `-c` | string | — | Path to config file. |
| `--data-dir <path>` | `-d` | string | — | Paperclip data directory root. |
| `--repair` | — | flag | `false` | Attempt to repair issues automatically. |
| `--yes` | `-y` | flag | `false` | Skip repair confirmation prompts. |

```sh
paperclipai doctor
paperclipai doctor --repair --yes
```

### `paperclipai env`

Print the resolved environment configuration for the current instance — useful for inspecting what the server actually sees after config + defaults + env overrides are merged.

```
paperclipai env [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--config <path>` | `-c` | string | — | Path to config file. |
| `--data-dir <path>` | `-d` | string | — | Paperclip data directory root. |

```sh
paperclipai env
```

### `paperclipai configure`

Update one configuration section in place. Each `--section` value enters an interactive editor for that part of `config.json`.

```
paperclipai configure --section <section> [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--section <section>` | `-s` | enum | — | One of `llm`, `database`, `logging`, `server`, `storage`, `secrets`. |
| `--config <path>` | `-c` | string | — | Path to config file. |
| `--data-dir <path>` | `-d` | string | — | Paperclip data directory root. |

```sh
paperclipai configure --section storage
paperclipai configure --section secrets
```

### `paperclipai db:backup`

Create a one-off database backup using current config.

```
paperclipai db:backup [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--dir <path>` | — | string | from config / `$PAPERCLIP_DB_BACKUP_DIR` | Backup output directory (overrides config). |
| `--retention-days <days>` | — | number | from config | Retention window used for pruning. |
| `--filename-prefix <prefix>` | — | string | `paperclip` | Backup filename prefix. |
| `--json` | — | flag | off | Print backup metadata as JSON. |
| `--config <path>` | `-c` | string | — | Path to config file. |
| `--data-dir <path>` | `-d` | string | — | Paperclip data directory root. |

```sh
paperclipai db:backup --dir ./backups --retention-days 7
paperclipai db:backup --json
```

### `paperclipai allowed-hostname <host>`

Allow a hostname for authenticated/private mode access. Updates the local config; the new hostname takes effect after a server restart.

```
paperclipai allowed-hostname [options] <host>
```

| Argument | Description |
|---|---|
| `host` | Hostname to allow (for example `dotta-macbook-pro`). |

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--config <path>` | `-c` | string | — | Path to config file. |
| `--data-dir <path>` | `-d` | string | — | Paperclip data directory root. |

```sh
paperclipai allowed-hostname my-tailscale-host
```

### `paperclipai run`

Bootstrap local setup (onboard if missing, doctor with optional repair) and start the server.

```
paperclipai run [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--config <path>` | `-c` | string | — | Path to config file. |
| `--data-dir <path>` | `-d` | string | — | Paperclip data directory root. |
| `--instance <id>` | `-i` | string | `default` | Local instance id. |
| `--repair` | — | flag | `true` | Attempt automatic repairs during doctor. |
| `--no-repair` | — | flag | — | Disable automatic repairs during doctor. |

```sh
paperclipai run
paperclipai run --instance dev --no-repair
```

---

## `heartbeat`

Manually invoke an agent.

### `paperclipai heartbeat run`

Run one agent heartbeat and stream live logs. Useful for debugging adapter issues or for forcing an agent to wake up on demand.

```
paperclipai heartbeat run [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--agent-id <agentId>` | `-a` | string | — | Agent ID to invoke. |
| `--source <source>` | — | enum | `on_demand` | Invocation source: `timer`, `assignment`, `on_demand`, `automation`. |
| `--trigger <trigger>` | — | enum | `manual` | Trigger detail: `manual`, `ping`, `callback`, `system`. |
| `--timeout-ms <ms>` | — | number | `0` (no timeout) | Max time to wait before giving up. |
| `--debug` | — | flag | off | Show raw adapter stdout/stderr JSON chunks. |
| Common client flags | — | — | — | `-c`, `-d`, `--context`, `--profile`, `--api-base`, `--api-key`, `--json`. |

```sh
paperclipai heartbeat run --agent-id <agent-id>
paperclipai heartbeat run --agent-id <agent-id> --debug --timeout-ms 60000
```

---

## `context`

Manage CLI client context profiles. Profiles persist API base URL, company ID, and the name of the env var that holds the API key.

### `paperclipai context show`

Show current context and the active profile.

```
paperclipai context show [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--data-dir <path>` | `-d` | string | — | Paperclip data directory root. |
| `--context <path>` | — | string | — | Path to CLI context file. |
| `--profile <name>` | — | string | active profile | Profile to inspect. |
| `--json` | — | flag | off | Output raw JSON. |

### `paperclipai context list`

List available context profiles.

```
paperclipai context list [options]
```

Same flag set as `context show` (without `--profile`).

### `paperclipai context use <profile>`

Set the active context profile.

```
paperclipai context use [options] <profile>
```

| Argument | Description |
|---|---|
| `profile` | Profile name. |

### `paperclipai context set`

Set values on a profile. Use `--use` to also activate it.

```
paperclipai context set [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--profile <name>` | string | active profile | Profile name. |
| `--api-base <url>` | string | — | Default API base URL. |
| `--company-id <id>` | string | — | Default company ID. |
| `--api-key-env-var-name <name>` | string | — | Env var that contains the API key (recommended over inline keys). |
| `--use` | flag | off | Set this profile as active. |
| `--json` | flag | off | Output raw JSON. |
| `--data-dir <path>` | string | — | Paperclip data directory root. |
| `--context <path>` | string | — | Path to CLI context file. |

```sh
paperclipai context set --api-base http://localhost:3100 --company-id <company-id> --use
paperclipai context set --api-key-env-var-name PAPERCLIP_API_KEY
```

---

## `company`

### `paperclipai company list`

List companies the caller can access.

```
paperclipai company list [options]
```

Common client flags only. Add `--json` to script against the result.

### `paperclipai company get <companyId>`

Get one company by ID.

```
paperclipai company get [options] <companyId>
```

| Argument | Description |
|---|---|
| `companyId` | Company ID. |

### `paperclipai company export <companyId>`

Export a company into a portable markdown package.

```
paperclipai company export [options] <companyId>
```

| Argument | Description |
|---|---|
| `companyId` | Company ID. |

| Flag | Type | Default | Description |
|---|---|---|---|
| `--out <path>` | string | — | Output directory. |
| `--include <values>` | csv | `company,agents` | Subset to include: any of `company`, `agents`, `projects`, `issues`, `tasks`, `skills`. |
| `--skills <values>` | csv | — | Skill slugs/keys to export. |
| `--projects <values>` | csv | — | Project shortnames/ids to export. |
| `--issues <values>` | csv | — | Issue identifiers/ids to export. |
| `--project-issues <values>` | csv | — | Project shortnames/ids whose issues should be exported. |
| `--expand-referenced-skills` | flag | `false` | Vendor skill contents instead of exporting upstream references. |

```sh
paperclipai company export <company-id> --out ./exports/acme --include company,agents,issues
```

### `paperclipai company import <fromPathOrUrl>`

Import a portable markdown company package from a local path, URL, GitHub repo, or `.zip` archive.

```
paperclipai company import [options] <fromPathOrUrl>
```

| Argument | Description |
|---|---|
| `fromPathOrUrl` | Source path or URL. Local paths may point at a directory or a `.zip` archive; URLs may resolve to a GitHub repo or a downloadable `.zip`. |

| Flag | Type | Default | Description |
|---|---|---|---|
| `--include <values>` | csv | — | Subset to include (same enum as `export`). |
| `--target <mode>` | enum | — | `new` or `existing`. |
| `-C, --company-id <id>` | string | — | Existing target company ID (for `--target existing`). |
| `--new-company-name <name>` | string | — | Name override for `--target new`. |
| `--agents <list>` | csv | `all` | Agent slugs to import, or `all`. |
| `--collision <mode>` | enum | `rename` | Collision strategy: `rename`, `skip`, `replace`. |
| `--ref <value>` | string | — | Git ref for GitHub imports (branch, tag, or commit). |
| `--paperclip-url <url>` | string | — | Alias for `--api-base` on this command. |
| `--yes` | flag | `false` | Accept default selection and skip the pre-import confirmation prompt. |
| `--dry-run` | flag | `false` | Preview only; do not apply. |

```sh
paperclipai company import ./exports/acme --target new --new-company-name "Acme Imported"
paperclipai company import https://github.com/paperclipai/example-company --ref main --dry-run
```

### `paperclipai company delete <selector>`

Delete a company by ID or shortname/prefix. Destructive; guarded by required confirmation.

```
paperclipai company delete [options] <selector>
```

| Argument | Description |
|---|---|
| `selector` | Company ID or issue prefix (for example `PAP`). |

| Flag | Type | Default | Description |
|---|---|---|---|
| `--by <mode>` | enum | `auto` | Selector mode: `auto`, `id`, or `prefix`. |
| `--yes` | flag | `false` | **Required** safety flag. |
| `--confirm <value>` | string | — | **Required** safety value: target company ID or shortname/prefix. |

```sh
paperclipai company delete PAP --by prefix --yes --confirm PAP
```

---

## `issue`

### `paperclipai issue list`

List issues for a company.

```
paperclipai issue list [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `-C, --company-id <id>` | string | profile / env | Company ID. |
| `--status <csv>` | csv | — | Comma-separated statuses (`backlog`, `todo`, `in_progress`, `in_review`, `done`, `blocked`, `cancelled`). |
| `--assignee-agent-id <id>` | string | — | Filter by assignee agent ID. |
| `--project-id <id>` | string | — | Filter by project ID. |
| `--match <text>` | string | — | Local text match on identifier/title/description. |

### `paperclipai issue get <idOrIdentifier>`

Get an issue by UUID or identifier (e.g. `PAP-12`).

```
paperclipai issue get [options] <idOrIdentifier>
```

### `paperclipai issue create`

Create an issue.

```
paperclipai issue create [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `-C, --company-id <id>` | string | profile / env | Company ID. |
| `--title <title>` | string | — | Issue title. |
| `--description <text>` | string | — | Issue description. |
| `--status <status>` | enum | — | Initial status. |
| `--priority <priority>` | enum | — | `critical`, `high`, `medium`, `low`. |
| `--assignee-agent-id <id>` | string | — | Assignee agent ID. |
| `--project-id <id>` | string | — | Project ID. |
| `--goal-id <id>` | string | — | Goal ID. |
| `--parent-id <id>` | string | — | Parent issue ID. |
| `--request-depth <n>` | number | — | Request depth integer. |
| `--billing-code <code>` | string | — | Billing code. |

```sh
paperclipai issue create -C <company-id> --title "Fix dashboard latency" --priority high --assignee-agent-id <agent-id>
```

### `paperclipai issue update <issueId>`

Update an issue and optionally add a comment in the same call.

```
paperclipai issue update [options] <issueId>
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--title <title>` | string | — | Issue title. |
| `--description <text>` | string | — | Issue description. |
| `--status <status>` | enum | — | New status. |
| `--priority <priority>` | enum | — | New priority. |
| `--assignee-agent-id <id>` | string | — | Reassign agent. |
| `--project-id <id>` | string | — | Move to project. |
| `--goal-id <id>` | string | — | Move to goal. |
| `--parent-id <id>` | string | — | Re-parent. |
| `--request-depth <n>` | number | — | Request depth integer. |
| `--billing-code <code>` | string | — | Billing code. |
| `--comment <text>` | string | — | Optional comment to add with update. |
| `--hidden-at <iso8601\|null>` | string | — | Set `hiddenAt` timestamp or literal `null`. |

```sh
paperclipai issue update <issue-id> --status in_progress --comment "Started triage"
paperclipai issue update <issue-id> --status blocked --comment "Waiting on infra access"
```

### `paperclipai issue comment <issueId>`

Add a comment to an issue. Use `--reopen` to revive a closed issue with the same call.

```
paperclipai issue comment [options] <issueId>
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--body <text>` | string | — | Comment body. |
| `--reopen` | flag | off | Reopen if issue is `done`/`cancelled`. |

### `paperclipai issue checkout <issueId>`

Take ownership of an issue for an agent.

```
paperclipai issue checkout [options] <issueId>
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--agent-id <id>` | string | — | Agent ID claiming the issue. |
| `--expected-statuses <csv>` | csv | `todo,backlog,blocked` | Statuses the issue is allowed to be in. |

### `paperclipai issue release <issueId>`

Release the issue back to `todo` and clear the assignee.

```
paperclipai issue release [options] <issueId>
```

---

## `agent`

### `paperclipai agent list`

List agents for a company.

```
paperclipai agent list [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `-C, --company-id <id>` | string | profile / env | Company ID. |

### `paperclipai agent get <agentId>`

Get one agent by ID.

```
paperclipai agent get [options] <agentId>
```

### `paperclipai agent local-cli <agentRef>`

Create an agent API key, install local Paperclip skills for Codex/Claude, and print the shell exports needed to run the local CLI as that agent.

```
paperclipai agent local-cli [options] <agentRef>
```

| Argument | Description |
|---|---|
| `agentRef` | Agent ID or shortname/url-key. |

| Flag | Type | Default | Description |
|---|---|---|---|
| `-C, --company-id <id>` | string | profile / env | Company ID. |
| `--key-name <name>` | string | `local-cli` | API key label. |
| `--no-install-skills` | flag | off | Skip installing skills into `~/.codex/skills` and `~/.claude/skills`. |

The command prints a block of `export PAPERCLIP_API_URL=… PAPERCLIP_COMPANY_ID=… PAPERCLIP_AGENT_ID=… PAPERCLIP_API_KEY=…` lines. Pipe to `eval` or copy into your shell.

```sh
paperclipai agent local-cli claudecoder -C <company-id>
eval "$(paperclipai agent local-cli claudecoder -C <company-id>)"
```

---

## `skills`

Company and agent skill operations. Commands split into three groups: read-only **catalog** browsing (not company-scoped), the **company skill library**, and per-agent **desired-skill sync**. Every library and agent subcommand requires a company scope and accepts the common client flags.

### `paperclipai skills browse`

Browse app-shipped catalog skills without installing them. Not company-scoped.

```
paperclipai skills browse [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--kind <kind>` | enum | — | Catalog kind filter: `bundled` or `optional`. |
| `--category <slug>` | string | — | Catalog category filter. |
| `--query <text>` | string | — | Search catalog text. |

### `paperclipai skills search <query>`

Search app-shipped catalog skills without installing them. Not company-scoped.

```
paperclipai skills search [options] <query>
```

| Argument | Description |
|---|---|
| `query` | Search text. |

| Flag | Type | Default | Description |
|---|---|---|---|
| `--kind <kind>` | enum | — | Catalog kind filter: `bundled` or `optional`. |
| `--category <slug>` | string | — | Catalog category filter. |

### `paperclipai skills inspect <catalogRef>`

Inspect an app-shipped catalog skill before installing it. Not company-scoped.

```
paperclipai skills inspect [options] <catalogRef>
```

| Argument | Description |
|---|---|
| `catalogRef` | Catalog skill ID, key, or unique slug. |

### `paperclipai skills install <catalogRef>`

Install a catalog skill into the company skill library; does not attach it to agents.

```
paperclipai skills install [options] <catalogRef>
```

| Argument | Description |
|---|---|
| `catalogRef` | Catalog skill ID, key, or unique slug. |

| Flag | Type | Default | Description |
|---|---|---|---|
| `--as <slug>` | string | — | Company skill slug override. |
| `--force` | flag | `false` | Replace a same-key catalog-managed skill when the server allows it. |
| Common client flags | — | — | `-C, --company-id` (required) plus `--api-base`, `--api-key`, `--json`, etc. |

### `paperclipai skills list`

List company skills.

```
paperclipai skills list [options]
```

Common client flags; `-C, --company-id` required.

### `paperclipai skills show <skillRef>`

Show company skill details.

```
paperclipai skills show [options] <skillRef>
```

| Argument | Description |
|---|---|
| `skillRef` | Company skill ID, key, or unique slug. |

### `paperclipai skills file <skillRef>`

Print a company skill file.

```
paperclipai skills file [options] <skillRef>
```

| Argument | Description |
|---|---|
| `skillRef` | Company skill ID, key, or unique slug. |

| Flag | Type | Default | Description |
|---|---|---|---|
| `--path <path>` | string | `SKILL.md` | Relative file path. |

### `paperclipai skills import <source>`

Import company skills from a local path, GitHub, skills.sh, or URL source.

```
paperclipai skills import [options] <source>
```

| Argument | Description |
|---|---|
| `source` | Skill source: local path, GitHub repo, skills.sh reference, or URL. |

### `paperclipai skills create`

Create a managed local company skill.

```
paperclipai skills create [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--name <name>` | string | — | **Required.** Skill name. |
| `--slug <slug>` | string | — | Skill slug. |
| `--description <text>` | string | — | Skill description. |
| `--body-file <path>` | string | — | Markdown body file; use `-` to read stdin. |

### `paperclipai skills scan-projects`

Scan project workspaces for skills.

```
paperclipai skills scan-projects [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--project-id <id>` | string | — | Project ID to scan; may be repeated. |
| `--workspace-id <id>` | string | — | Workspace ID to scan; may be repeated. |

### `paperclipai skills check [skillRef]`

Check company skill update status. Omit the reference to check every skill.

```
paperclipai skills check [options] [skillRef]
```

| Argument | Description |
|---|---|
| `skillRef` | Optional company skill ID, key, or unique slug. |

### `paperclipai skills update [skillRef]`

Install company skill updates. Pass a single skill reference or `--all`, not both.

```
paperclipai skills update [options] [skillRef]
```

| Argument | Description |
|---|---|
| `skillRef` | Company skill ID, key, or unique slug (required unless `--all`). |

| Flag | Type | Default | Description |
|---|---|---|---|
| `--all` | flag | `false` | Check all skills and install available updates. |
| `--force` | flag | `false` | Discard local-modification or soft-audit holds; hard-stop audit findings still fail. |

### `paperclipai skills audit [skillRef]`

Audit installed company skill bytes without executing them. Omit the reference to audit every skill.

```
paperclipai skills audit [options] [skillRef]
```

| Argument | Description |
|---|---|
| `skillRef` | Optional company skill ID, key, or unique slug. |

### `paperclipai skills reset <skillRef>`

Reset a catalog-managed company skill to its pinned installed origin.

```
paperclipai skills reset [options] <skillRef>
```

| Argument | Description |
|---|---|
| `skillRef` | Company skill ID, key, or unique slug. |

| Flag | Type | Default | Description |
|---|---|---|---|
| `--yes` | flag | `false` | Confirm reset without prompting. |
| `--force` | flag | `false` | Discard local modifications or accept soft audit warnings; hard-stop audit findings still fail. |

### `paperclipai skills remove <skillRef>`

Remove a company skill.

```
paperclipai skills remove [options] <skillRef>
```

| Argument | Description |
|---|---|
| `skillRef` | Company skill ID, key, or unique slug. |

| Flag | Type | Default | Description |
|---|---|---|---|
| `--yes` | flag | `false` | Confirm removal without prompting. |

### `paperclipai skills agent list <agentRef>`

List an agent runtime skill snapshot.

```
paperclipai skills agent list [options] <agentRef>
```

| Argument | Description |
|---|---|
| `agentRef` | Agent ID or shortname/url-key. |

### `paperclipai skills agent sync <agentRef>`

Replace an agent's non-required desired company skills and sync runtime state. At least one `--skill` is required.

```
paperclipai skills agent sync [options] <agentRef>
```

| Argument | Description |
|---|---|
| `agentRef` | Agent ID or shortname/url-key. |

| Flag | Type | Default | Description |
|---|---|---|---|
| `--skill <skillRef>` | string | — | Desired company skill ID, key, or slug; may be repeated. |

### `paperclipai skills agent clear <agentRef>`

Clear an agent's non-required desired company skills and sync runtime state. Required Paperclip skills remain server-enforced.

```
paperclipai skills agent clear [options] <agentRef>
```

| Argument | Description |
|---|---|
| `agentRef` | Agent ID or shortname/url-key. |

| Flag | Type | Default | Description |
|---|---|---|---|
| `--yes` | flag | `false` | Confirm clear without prompting. |

---

## `approval`

### `paperclipai approval list`

```
paperclipai approval list [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `-C, --company-id <id>` | string | profile / env | Company ID. |
| `--status <status>` | enum | — | Status filter (e.g. `pending`, `approved`, `rejected`, `revision_requested`). |

### `paperclipai approval get <approvalId>`

```
paperclipai approval get [options] <approvalId>
```

### `paperclipai approval create`

```
paperclipai approval create [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `-C, --company-id <id>` | string | profile / env | Company ID. |
| `--type <type>` | enum | — | Approval type, e.g. `hire_agent`, `approve_ceo_strategy`. |
| `--payload <json>` | json string | — | Approval payload as a JSON object. |
| `--requested-by-agent-id <id>` | string | — | Requesting agent ID. |
| `--issue-ids <csv>` | csv | — | Linked issue IDs. |

### `paperclipai approval approve <approvalId>`

```
paperclipai approval approve [options] <approvalId>
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--decision-note <text>` | string | — | Decision note. |
| `--decided-by-user-id <id>` | string | — | Decision actor user ID. |

### `paperclipai approval reject <approvalId>`

```
paperclipai approval reject [options] <approvalId>
```

Same flags as `approve`.

### `paperclipai approval request-revision <approvalId>`

```
paperclipai approval request-revision [options] <approvalId>
```

Same flags as `approve`.

### `paperclipai approval resubmit <approvalId>`

```
paperclipai approval resubmit [options] <approvalId>
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--payload <json>` | json string | — | Replacement payload. |

### `paperclipai approval comment <approvalId>`

```
paperclipai approval comment [options] <approvalId>
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--body <text>` | string | — | Comment body. |

---

## `activity`

### `paperclipai activity list`

List company activity log entries.

```
paperclipai activity list [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `-C, --company-id <id>` | string | profile / env | Company ID. |
| `--agent-id <id>` | string | — | Filter by agent ID. |
| `--entity-type <type>` | string | — | Filter by entity type (e.g. `issue`, `approval`). |
| `--entity-id <id>` | string | — | Filter by entity ID. |

---

## `dashboard`

### `paperclipai dashboard get`

Get the dashboard summary for a company.

```
paperclipai dashboard get [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `-C, --company-id <id>` | string | profile / env | Company ID. |

---

## `worktree`

These commands provision and inspect repo-local Paperclip instances bound to a git worktree. Useful for running multiple isolated companies side by side without colliding on `~/.paperclip`.

### `paperclipai worktree init`

Create repo-local config/env and an isolated instance for the current worktree.

```
paperclipai worktree init [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--name <name>` | string | — | Display name used to derive the instance id. |
| `--instance <id>` | string | — | Explicit isolated instance id. |
| `--home <path>` | string | `$PAPERCLIP_WORKTREES_DIR` or `~/.paperclip-worktrees` | Home root for worktree instances. |
| `--from-config <path>` | string | — | Source `config.json` to seed from. |
| `--from-data-dir <path>` | string | — | Source `PAPERCLIP_HOME` for deriving the source config. |
| `--from-instance <id>` | string | `default` | Source instance id. |
| `--server-port <port>` | number | — | Preferred server port. |
| `--db-port <port>` | number | — | Preferred embedded Postgres port. |
| `--seed-mode <mode>` | enum | `minimal` | Seed profile: `minimal` or `full`. |
| `--no-seed` | flag | off | Skip database seeding from the source instance. |
| `--force` | flag | `false` | Replace existing repo-local config and isolated instance data. |

> **Scope of `--force`.** It only rewrites the two files it's about to regenerate — `.paperclip/config.json` and `.paperclip/.env` — and clears this worktree's own `instanceRoot`. It does **not** touch `.paperclip/worktrees/`, so any sibling worktree checkouts under the same repo are preserved. Safe to run from inside a worktree without disturbing siblings.

### `paperclipai worktree env`

Print shell exports for the current worktree-local instance.

```
paperclipai worktree env [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--config <path>` | `-c` | string | — | Path to config file. |
| `--json` | — | flag | off | Print JSON instead of shell exports. |

### `paperclipai worktree:make <name>`

Create `~/NAME` as a git worktree, then initialize an isolated Paperclip instance inside it.

```
paperclipai worktree:make [options] <name>
```

| Argument | Description |
|---|---|
| `name` | Worktree name — auto-prefixed with `paperclip-` if needed (created at `~/paperclip-NAME`). |

| Flag | Type | Default | Description |
|---|---|---|---|
| `--start-point <ref>` | string | `$PAPERCLIP_WORKTREE_START_POINT` | Remote ref to base the new branch on. |
| `--instance <id>` | string | — | Explicit isolated instance id. |
| `--home <path>` | string | `$PAPERCLIP_WORKTREES_DIR` or `~/.paperclip-worktrees` | Home root for worktree instances. |
| `--from-config <path>` | string | — | Source `config.json` to seed from. |
| `--from-data-dir <path>` | string | — | Source `PAPERCLIP_HOME` for deriving the source config. |
| `--from-instance <id>` | string | `default` | Source instance id. |
| `--server-port <port>` | number | — | Preferred server port. |
| `--db-port <port>` | number | — | Preferred embedded Postgres port. |
| `--seed-mode <mode>` | enum | `minimal` | `minimal` or `full`. |
| `--no-seed` | flag | off | Skip database seeding. |
| `--force` | flag | `false` | Replace existing repo-local config and isolated instance data. |

### `paperclipai worktree:list`

List git worktrees visible from the current repo and whether they look like Paperclip worktrees.

```
paperclipai worktree:list [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--json` | flag | off | Print JSON. |

### `paperclipai worktree:merge-history [source]`

Preview or import issue/comment history from another worktree into the current instance.

```
paperclipai worktree:merge-history [options] [source]
```

| Argument | Description |
|---|---|
| `source` | Optional source worktree path, directory name, or branch name (back-compat alias for `--from`). |

| Flag | Type | Default | Description |
|---|---|---|---|
| `--from <worktree>` | string | — | Source worktree path, directory name, branch name, or `current`. |
| `--to <worktree>` | string | current | Target worktree path, directory name, branch name, or `current`. |
| `--company <id-or-prefix>` | string | — | Shared company id or issue prefix inside the chosen instances. |
| `--scope <items>` | csv | `issues,comments` | Scopes to import. |
| `--apply` | flag | `false` | Apply the import after previewing. |
| `--dry` | flag | `false` | Preview only. |
| `--yes` | flag | `false` | Skip the interactive confirmation prompt when applying. |

### `paperclipai worktree:cleanup <name>`

Safely remove a worktree, its branch, and its isolated instance data.

```
paperclipai worktree:cleanup [options] <name>
```

| Argument | Description |
|---|---|
| `name` | Worktree name — auto-prefixed with `paperclip-` if needed. |

| Flag | Type | Default | Description |
|---|---|---|---|
| `--instance <id>` | string | derived from name | Explicit instance id. |
| `--home <path>` | string | `$PAPERCLIP_WORKTREES_DIR` or `~/.paperclip-worktrees` | Home root for worktree instances. |
| `--force` | flag | `false` | Bypass safety checks (uncommitted changes, unique commits). |

---

## `plugin`

Lifecycle management for instance plugins.

### `paperclipai plugin list`

```
paperclipai plugin list [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--status <status>` | enum | — | Filter by status: `ready`, `error`, `disabled`, `installed`, `upgrade_pending`. |

### `paperclipai plugin install <package>`

Install a plugin from a local path or npm package.

```
paperclipai plugin install [options] <package>
```

| Argument | Description |
|---|---|
| `package` | Local filesystem path or npm package spec. |

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--local` | `-l` | flag | `false` | Treat `<package>` as a local filesystem path. |
| `--version <version>` | — | string | latest | Specific npm version (npm packages only). |

```sh
paperclipai plugin install ./my-plugin --local
paperclipai plugin install @acme/plugin-linear
paperclipai plugin install @acme/plugin-linear --version 1.2.3
```

### `paperclipai plugin uninstall <pluginKey>`

```
paperclipai plugin uninstall [options] <pluginKey>
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--force` | flag | `false` | Purge all plugin state and config (hard delete). |

### `paperclipai plugin enable <pluginKey>`

Enable a disabled or errored plugin.

```
paperclipai plugin enable [options] <pluginKey>
```

### `paperclipai plugin disable <pluginKey>`

Disable a running plugin without uninstalling it.

```
paperclipai plugin disable [options] <pluginKey>
```

### `paperclipai plugin inspect <pluginKey>`

Show full details for an installed plugin.

```
paperclipai plugin inspect [options] <pluginKey>
```

### `paperclipai plugin examples`

List bundled example plugins available for local install.

```
paperclipai plugin examples [options]
```

---

## `auth`

Authentication and bootstrap utilities for board-user access.

### `paperclipai auth bootstrap-ceo`

Create a one-time bootstrap invite URL for the first instance admin. Local-only; does not call the API.

```
paperclipai auth bootstrap-ceo [options]
```

| Flag | Short | Type | Default | Description |
|---|---|---|---|---|
| `--config <path>` | `-c` | string | — | Path to config file. |
| `--data-dir <path>` | `-d` | string | — | Paperclip data directory root. |
| `--force` | — | flag | `false` | Create new invite even if admin already exists. |
| `--expires-hours <hours>` | — | number | server default | Invite expiration window. |
| `--base-url <url>` | — | string | from config | Public base URL used to print the invite link. |

### `paperclipai auth login`

Authenticate the CLI for board-user access. Stores credentials per API base.

```
paperclipai auth login [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--instance-admin` | flag | `false` | Request instance-admin approval instead of plain board access. |
| `-C, --company-id <id>` | string | profile / env | Company ID (overrides context default). |

### `paperclipai auth logout`

Remove the stored board-user credential for the current API base.

```
paperclipai auth logout [options]
```

### `paperclipai auth whoami`

Show the current board-user identity for the current API base.

```
paperclipai auth whoami [options]
```

---

## `feedback`

Inspect and export local feedback traces collected from the board UI.

### `paperclipai feedback report`

Render a terminal report for a company's feedback traces.

```
paperclipai feedback report [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `-C, --company-id <id>` | string | — | Company ID (overrides context default). |
| `--target-type <type>` | string | — | Filter by target type. |
| `--vote <vote>` | string | — | Filter by vote value. |
| `--status <status>` | string | — | Filter by trace status. |
| `--project-id <id>` | string | — | Filter by project ID. |
| `--issue-id <id>` | string | — | Filter by issue ID. |
| `--from <iso8601>` | string | — | Only include traces created at or after this timestamp. |
| `--to <iso8601>` | string | — | Only include traces created at or before this timestamp. |
| `--shared-only` | flag | `false` | Only include traces eligible for sharing or export. |
| `--payloads` | flag | `false` | Include raw payload dumps in the terminal report. |

### `paperclipai feedback export`

Export feedback votes and raw trace bundles into a folder plus a `.zip` archive.

```
paperclipai feedback export [options]
```

Accepts the same filter flags as `feedback report` plus an output directory option. See `paperclipai feedback export --help` for the full list.

---

## `secrets`

Secret declaration and provider operations against a live Paperclip instance.

### `paperclipai secrets list`

List secret metadata for a company.

```
paperclipai secrets list [options]
```

### `paperclipai secrets declarations`

List portable env declarations emitted by company export.

```
paperclipai secrets declarations [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--include <values>` | csv | `company,agents,projects` | Comma-separated include set: `company`, `agents`, `projects`, `issues`, `tasks`, `skills`. |
| `--kind <kind>` | enum | `all` | Filter declarations: `all`, `secret`, `plain`. |

### `paperclipai secrets create`

Create a Paperclip-managed secret.

```
paperclipai secrets create [options]
```

| Flag | Type | Description |
|---|---|---|
| `--key <key>` | string | Portable secret key. |
| `--provider <provider>` | string | Secret provider id. |
| `--value <value>` | string | Secret value (inline). |
| `--value-env <name>` | string | Read the secret value from an environment variable. |
| `--description <text>` | string | Description. |

### `paperclipai secrets link`

Link an external provider-owned secret without storing its value in Paperclip.

```
paperclipai secrets link [options]
```

| Flag | Type | Description |
|---|---|---|
| `--key <key>` | string | Portable secret key. |
| `--provider-version-ref <ref>` | string | Provider version id or label. |
| `--description <text>` | string | Description. |

### `paperclipai secrets doctor`

Run secret provider health checks through the Paperclip API.

```
paperclipai secrets doctor [options]
```

### `paperclipai secrets providers`

List configured secret provider descriptors.

```
paperclipai secrets providers [options]
```

### `paperclipai secrets migrate-inline-env`

Migrate inline sensitive agent env values into secret references.

```
paperclipai secrets migrate-inline-env [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--apply` | flag | `false` | Persist changes. The default is a dry run. |

---

## `env-lab`

Manage deterministic local environment fixtures used for adapter and runtime experiments.

### `paperclipai env-lab up`

Start the default SSH env-lab fixture.

```
paperclipai env-lab up [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `-i, --instance <id>` | string | current / `default` | Paperclip instance id. |
| `--json` | flag | `false` | Print machine-readable fixture details. |

### `paperclipai env-lab status`

Show the current SSH env-lab fixture state.

```
paperclipai env-lab status [options]
```

Accepts the same `-i, --instance <id>` and `--json` flags as `env-lab up`.

### `paperclipai env-lab down`

Stop the default SSH env-lab fixture.

```
paperclipai env-lab down [options]
```

Accepts the same `-i, --instance <id>` and `--json` flags as `env-lab up`.

### `paperclipai env-lab doctor`

Check SSH fixture prerequisites and current status.

```
paperclipai env-lab doctor [options]
```

Accepts the same `-i, --instance <id>` and `--json` flags as `env-lab up`.

---

## `routines`

Local routine maintenance commands.

### `paperclipai routines disable-all`

Pause all non-archived routines in the configured local instance for one company.

```
paperclipai routines disable-all [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `-c, --config <path>` | string | — | Path to config file. |
| `-d, --data-dir <path>` | string | — | Paperclip data directory root (isolates state from `~/.paperclip`). |
| `-C, --company-id <id>` | string | — | Company ID. |
| `--json` | flag | `false` | Output raw JSON. |

---

## `cloud`

Paperclip Cloud upstream sync commands. Pushes a local company into a connected Paperclip Cloud stack. Gated behind the `enableCloudSync` instance experimental setting — both the CLI and the server refuse to run until it's `true`. Walkthrough: [Sync a local company to a Paperclip Cloud upstream](../../how-to/sync-to-cloud-upstream.md).

### `paperclipai cloud connect <remote-url>`

Authorize this local instance to push into a Paperclip Cloud stack. Generates an ed25519 source identity, runs the PKCE (or device-code) authorization flow, and stores the connection under `~/.paperclip/<instance>/secrets/cloud-upstream-connections.json` (mode `0600`).

```
paperclipai cloud connect <remote-url> [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--no-browser` | flag | `false` | Use the device-code flow instead of opening a browser. |
| `--json` | flag | `false` | Print a redacted connection record as JSON. |

```sh
paperclipai cloud connect https://cloud.example.com
paperclipai cloud connect https://cloud.example.com --no-browser
```

### `paperclipai cloud push`

Preview or apply a local company push into the connected Paperclip Cloud stack. Requires a stored connection (`cloud connect` first) and `enableCloudSync: true` on the local instance.

```
paperclipai cloud push --company <local-company-id> [options]
```

| Flag | Type | Default | Description |
|---|---|---|---|
| `--company <local-company-id>` | string | — | **Required.** Local company id to export. |
| `--remote-url <remote-url>` | string | current connection | Use a specific stored cloud connection (matched by `remoteUrl` or `targetOrigin`). |
| `--dry-run` | flag | `false` | Preview without applying. |
| `--max-entities-per-chunk <count>` | number | `100` | Chunk size for upstream uploads. |
| `--json` | flag | `false` | Emit the full `result` and trailing `events` as JSON. |

Exit codes for `cloud push` (in addition to the standard `0`/`1`):

| Code | Meaning |
|---|---|
| `2` | At least one conflict or stale mapping needs human attention. Re-run with `--dry-run` to inspect. |
| `3` | Cloud upstream schema mismatch — the local and remote transfer schema majors disagree. |

```sh
paperclipai cloud push --company "$LOCAL_COMPANY_ID" --dry-run
paperclipai cloud push --company "$LOCAL_COMPANY_ID"
paperclipai cloud push --company "$LOCAL_COMPANY_ID" --max-entities-per-chunk 50 --json
```

---

## Environment Variables

The CLI reads these environment variables. Where both an env var and a flag exist, the flag wins.

### Local instance and config

| Variable | Read by | Meaning |
|---|---|---|
| `PAPERCLIP_HOME` | all local commands | Base directory for Paperclip data. Default `~/.paperclip`. |
| `PAPERCLIP_INSTANCE_ID` | all local commands | Instance id under `PAPERCLIP_HOME/instances/`. Default `default`. |
| `PAPERCLIP_CONFIG` | all local commands | Absolute path to a specific `config.json`. Overrides instance lookup. |
| `PAPERCLIP_CONTEXT` | client commands | Path to the CLI context file. Default `~/.paperclip/context.json`. |
| `PAPERCLIP_AUTH_STORE` | `auth` commands | Override for the local board-user credential store. |

### Client (server connection)

| Variable | Meaning |
|---|---|
| `PAPERCLIP_API_URL` | Default API base URL when neither `--api-base` nor a profile provides one. |
| `PAPERCLIP_API_KEY` | Bearer token used to authenticate API calls. |
| `PAPERCLIP_COMPANY_ID` | Default company id used when `--company-id` and the active profile are unset. |
| `PAPERCLIP_AGENT_ID` | Identity assumed by the local CLI when running as an agent (set by `agent local-cli`). |

### Worktree commands

| Variable | Meaning |
|---|---|
| `PAPERCLIP_WORKTREES_DIR` | Home root for worktree-local instances. Default `~/.paperclip-worktrees`. |
| `PAPERCLIP_WORKTREE_START_POINT` | Default `--start-point` for `worktree:make`. |
| `PAPERCLIP_WORKTREE_NAME` | Branding name written into the worktree env. |
| `PAPERCLIP_WORKTREE_COLOR` | Branding color written into the worktree env. |
| `PAPERCLIP_IN_WORKTREE` | Set automatically inside worktree-launched processes. |

### Server-side (consumed when the CLI starts the server)

These are mostly relevant to `paperclipai run` and `paperclipai env`. Full reference: [Environment Variables](../deploy/environment-variables.md).

| Variable | Meaning |
|---|---|
| `PAPERCLIP_PUBLIC_URL`, `PAPERCLIP_AUTH_PUBLIC_BASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_BASE_URL` | Public base URL for invites and auth. |
| `PAPERCLIP_AGENT_JWT_SECRET`, `PAPERCLIP_AGENT_JWT_TTL_SECONDS`, `PAPERCLIP_AGENT_JWT_ISSUER`, `PAPERCLIP_AGENT_JWT_AUDIENCE` | Agent JWT minting. |
| `PAPERCLIP_DEPLOYMENT_MODE`, `PAPERCLIP_DEPLOYMENT_EXPOSURE`, `PAPERCLIP_AUTH_BASE_URL_MODE`, `PAPERCLIP_ALLOWED_HOSTNAMES` | Deployment and auth mode. |
| `PAPERCLIP_STORAGE_PROVIDER`, `PAPERCLIP_STORAGE_LOCAL_DIR`, `PAPERCLIP_STORAGE_S3_BUCKET`, `PAPERCLIP_STORAGE_S3_REGION`, `PAPERCLIP_STORAGE_S3_ENDPOINT`, `PAPERCLIP_STORAGE_S3_PREFIX`, `PAPERCLIP_STORAGE_S3_FORCE_PATH_STYLE` | Storage backend. |
| `PAPERCLIP_SECRETS_PROVIDER`, `PAPERCLIP_SECRETS_STRICT_MODE`, `PAPERCLIP_SECRETS_MASTER_KEY`, `PAPERCLIP_SECRETS_MASTER_KEY_FILE` | Secrets backend. |
| `PAPERCLIP_DB_BACKUP_ENABLED`, `PAPERCLIP_DB_BACKUP_INTERVAL_MINUTES`, `PAPERCLIP_DB_BACKUP_RETENTION_DAYS`, `PAPERCLIP_DB_BACKUP_DIR` | Database backup. |
| `PAPERCLIP_SERVER_HOST`, `PAPERCLIP_SERVER_PORT` | Server bind. |

---

## Exit Codes

The CLI uses a binary success/failure model. Read `stderr` (or `--json` output) for the actual cause.

| Code | Meaning |
|---|---|
| `0` | Success, or the user cancelled an interactive prompt. |
| `1` | Any non-zero failure: validation error, API error (4xx/5xx), auth error, missing config, doctor blocking issue, etc. |

Pre-flight checks log structured doctor results before exiting `1`, and API errors print as `API error <status>: <message>` on `stderr` before exiting `1`.

---

## Examples

Five common flows, end-to-end. Each block is a complete sequence you can paste into a fresh shell after replacing the placeholder values.

### Bootstrap a local install

```sh
paperclipai onboard --yes
paperclipai run
```

### Set up a CLI context profile

```sh
paperclipai context set \
  --api-base http://localhost:3100 \
  --company-id <company-id> \
  --api-key-env-var-name PAPERCLIP_API_KEY \
  --use
export PAPERCLIP_API_KEY=<bearer-token>
paperclipai context show
```

### Run as a local agent (Claude or Codex)

```sh
eval "$(paperclipai agent local-cli claudecoder -C <company-id>)"
paperclipai issue list --status todo,in_progress
paperclipai heartbeat run --agent-id "$PAPERCLIP_AGENT_ID"
```

### Triage and update an issue

```sh
paperclipai issue list -C <company-id> --status todo --match dashboard
paperclipai issue get PAP-42
paperclipai issue update <issue-id> --status in_progress --comment "Started triage"
```

### Export and re-import a company

```sh
paperclipai company export <company-id> --out ./exports/acme --include company,agents,projects,issues
paperclipai company import ./exports/acme --target new --new-company-name "Acme Staging" --yes
```

---

## Related

- [CLI Overview](./overview.md) — orientation and common options.
- [Setup Commands](./setup-commands.md) — narrative walk-through of the install/repair flow.
- [Control-Plane Commands](./control-plane-commands.md) — narrative walk-through of company operations.
- [Environment Variables](../deploy/environment-variables.md) — full server-side env reference.
- [API Overview](../api/overview.md) — the HTTP surface most CLI commands wrap.
