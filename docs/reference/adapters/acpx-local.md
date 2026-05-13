---
paperclip_version: v2026.512.0
---

# ACPX Local

`acpx_local` runs an agent through the Agent Client Protocol via ACPX on the Paperclip host or a managed execution environment. Use it when you want a single built-in adapter that can target Claude, Codex, or a custom ACP server command.

> ⚠ ACPX runtime execution is still being enabled in stages. For today's stable Claude Code or Codex CLI wrapper behaviour, use [Claude Local](./claude-local.md) or [Codex Local](./codex-local.md).

---

## When To Use

- The agent should run through Agent Client Protocol via ACPX on the Paperclip host or a managed execution environment.
- You want one built-in adapter that can target Claude, Codex, or a custom ACP server command.
- You need Paperclip-managed session identity and live streamed ACP events in later ACPX runtime phases.

## When Not To Use

- You need today's stable Claude Code or Codex CLI wrapper behaviour. Use `claude_local` or `codex_local` until ACPX runtime execution is enabled.
- The host cannot satisfy ACPX's `Node >=22.12.0` prerequisite.
- The agent runtime is not an ACP server and cannot be launched through ACPX.

---

## Common Fields

| Field | Required | Default | Notes |
|---|---:|---|---|
| `agent` | no | `claude` | `claude`, `codex`, or `custom`. |
| `agentCommand` | no | — | Custom ACP command when `agent=custom`, or an override for a built-in ACP agent command. |
| `mode` | no | `persistent` | `persistent` or `oneshot`. Paperclip keeps session state persistent and may close the live process between runs. |
| `cwd` | no | — | Default absolute working directory fallback for the agent process. |
| `permissionMode` | no | `approve-all` | ACPX permission policy. `approve-all` auto-approves ACPX permission requests. |
| `nonInteractivePermissions` | no | `deny` | Policy when no operator is available to answer a permission prompt. |
| `timeoutSec` | no | `0` | Run timeout in seconds. `0` means no timeout. |
| `warmHandleIdleMs` | no | `0` | Idle window before Paperclip releases a warm ACPX handle. `0` keeps the warm handle disabled. |

The built-in `agent` options are `claude`, `codex`, and `custom`.

---

## Execution Details

- Paperclip launches the configured ACP server via ACPX and keeps a session handle.
- In `persistent` mode, Paperclip preserves session state across heartbeats and may keep a warm handle when `warmHandleIdleMs > 0`.
- In `oneshot` mode, Paperclip starts a fresh ACPX process for each run.

---

## Related

- [Claude Local](./claude-local.md) — stable Claude Code CLI wrapper.
- [Codex Local](./codex-local.md) — stable Codex CLI wrapper.
- [Creating An Adapter](./creating-an-adapter.md) — author your own adapter when none of the built-ins fit.
