---
paperclip_version: v2026.517.0
---

# Sandbox Providers

Sandbox provider plugins let Paperclip provision external compute as the execution environment for agent runs. They live in the parent repo under `packages/plugins/sandbox-providers/` and ship as published npm packages you install from the Plugin Manager (see [Plugins](../../administration/plugins.md)).

A sandbox provider plugin registers an `environmentDriver` of kind `sandbox_provider`. Once installed, the provider is available when you configure a sandbox environment under **Company Settings → Environments**.

> ⚠ TODO: expand each provider section with a full `configSchema` field reference once a stable cross-provider schema reference is published. The fields below come from each provider's `README.md` in the parent repo at `v2026.512.0`.

---

## Cloudflare (`provider: "cloudflare"`)

Package: `@paperclipai/plugin-cloudflare-sandbox`

Configure from **Company Settings → Environments** with core `driver: "sandbox"` and `provider: "cloudflare"`.

Required fields: `bridgeBaseUrl`, `bridgeAuthToken`.

Validation rules:

- `reuseLease: true` requires `keepAlive: true`.
- Non-local `bridgeBaseUrl` values must use `https://`.
- `sessionId` is required when `sessionStrategy` is `named`.
- `timeoutMs` and `bridgeRequestTimeoutMs` must each be between 1 and 86,400,000 ms.
- `requestedCwd` must be an absolute POSIX path. Default: `/workspace/paperclip`.

### Reliability tuning (v2026.517.0)

The Cloudflare bridge gained a batch of hardening fixes in v2026.517.0:

- **Bigger default container.** The bridge worker's container `instance_type` moved from `lite` to `standard-2` (with `max_instances: 10`), giving long-running agent runs more headroom before they're throttled.
- **SSE keepalives on streaming exec.** The execution-streaming endpoint now emits a `: keepalive\n\n` SSE comment every 15 seconds while a command is running, so intermediate proxies and Cloudflare's edge no longer idle-time out during silent stretches (for example, an `npm install` that downloads quietly for a minute).
- **Bridge control traffic skips streaming.** Commands tagged as bridge-channel (readiness probes, file payload reads, queue responses — anything where Paperclip consumes the stdout machine-side) now use the non-streaming `exec` path. The `@cloudflare/sandbox` SDK's streaming mode could drop the final stdout chunk when a short shell exited the same tick as it wrote, which surfaced as opaque `"invalid readiness JSON"` errors. Adapter sessions still stream so live logs flow as before.
- **Default bridge request timeout raised to 5 minutes.** `DEFAULT_BRIDGE_REQUEST_TIMEOUT_MS` jumped from 30,000 to 300,000 ms, matching the default sandbox `timeoutMs` so longer agent commands no longer hit the request budget before the inner timeout.
- **Sandbox-aware environment-test timeouts.** The `helloProbeTimeoutSec` used by `testEnvironment()` on Claude Local, Cursor Local, and OpenCode Local now branches on whether the run targets a sandbox: **90 s for sandbox targets**, and **45 s** (Claude, Cursor) or **60 s** (OpenCode) otherwise. Cursor's preliminary `versionProbeTimeoutSec` follows the same pattern (60 s sandbox, 45 s otherwise). The extra runway covers Cloudflare's `standard-2` cold-start without masking real hangs on local runs. (Grok Local ships its own `testEnvironment` in this release with a flat 45 s probe; sandbox awareness for Grok is on the follow-up list.)
- **Pi adapter install command corrected.** `pi_local`'s `SANDBOX_INSTALL_COMMAND` now points at `@earendil-works/pi-coding-agent@0.74.0` (pinned) instead of the previous unmaintained namespace, so Pi agents running inside a Cloudflare sandbox install cleanly on first run.

There's nothing to configure on the Paperclip side — upgrade the bridge worker image and the host to match this release and the fixes apply.

---

## Daytona (`provider: "daytona"`)

Package: `@paperclipai/plugin-daytona`

Configure from **Company Settings → Environments**. Put the Daytona API key on the sandbox environment itself — Paperclip stores pasted API keys as company secrets. `DAYTONA_API_KEY` remains an optional host-level fallback when an environment omits the key.

Optional `apiUrl` and `target` settings map directly to the Daytona SDK or client configuration. The driver supports both `snapshot`-based and `image`-based sandbox creation; setting both is rejected as ambiguous. Reusable leases map to Daytona stop/start semantics; non-reusable leases are deleted on release.

The current published Daytona SDK dependency is `@daytonaio/sdk`.

---

## exe.dev (`provider: "exe-dev"`)

Package: `@paperclipai/plugin-exe-dev`

Configure from **Company Settings → Environments**. Put the exe.dev API token on the sandbox environment itself — Paperclip stores pasted API keys and pasted SSH private keys as company secrets. `EXE_API_KEY` remains an optional host-level fallback when an environment omits the token.

The provider provisions VMs through exe.dev's HTTPS API and runs commands through direct SSH to the created VM. You need:

- An exe.dev API token that allows the lifecycle commands `new`, `ls`, and `rm`. `whoami` and `help` are recommended for manual debugging.
- SSH access from the Paperclip host to the resulting `*.exe.xyz` VMs.
- An SSH private key exe.dev recognises. You can either paste the private key into the environment config via `sshPrivateKey`, or point `sshIdentityFile` at an absolute host path.

---

## E2B (`provider: "e2b"`)

Package: `@paperclipai/plugin-e2b-sandbox` (shipped since `v2026.427.0`).

Configure from **Company Settings → Environments**. The plugin manifest declares a `configSchema` with `template`, `apiKey` (a Paperclip secret reference; falls back to `E2B_API_KEY`), and `timeoutMs`.

---

## Fake Sandbox (`provider: "fake-plugin"`)

Package: `@paperclipai/plugin-fake-sandbox`.

A first-party deterministic sandbox provider that runs commands in an isolated local temp directory while exercising the full sandbox-provider plugin lifecycle. It's intended for development, integration testing, and reproducing plugin-runtime issues without an external sandbox service.

The plugin is private to the monorepo (`"private": true` in its `package.json`), so it isn't published to npm — you build and install it locally as a workspace plugin. The `configSchema` exposes `image` (a deterministic fake label, default `fake:latest`), `timeoutMs` (default `300000`), and `reuseLease`. Pick this provider when you want predictable sandbox behavior in tests, or when you're debugging the provider-plugin contract itself.

---

## Related

- [Plugins](../../administration/plugins.md) — install and manage plugins from the Plugin Manager.
- [Creating An Adapter](./creating-an-adapter.md) — author your own adapter when none of the built-ins fit.
