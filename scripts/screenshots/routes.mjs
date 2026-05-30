/**
 * routes.mjs — CAPTURE_TARGETS definition and route-resolution helper.
 *
 * Each entry in CAPTURE_TARGETS describes one logical screenshot (theme-agnostic).
 * The `name` field is the relative path under SHOTS_DIR/<theme>/ (no theme prefix,
 * no .png extension).  `route` is a URL template whose tokens are substituted by
 * resolveRoute().  `dependsOn` lists parent-repo paths (relative to the parent repo
 * root) whose changes invalidate the screenshot.  `themes` defaults to both light
 * and dark.  `wait` is an optional additional settle time in ms (default 1200).
 *
 * Token reference for `route` templates:
 *   {prefix}       → seed-ids.companyPrefix (real auto-derived prefix, e.g. "ACM"),
 *                    falling back to COMPANY_PREFIX when no seed file is present
 *   {agentId}      → seed-ids.agentId       (worker agent, Bob)
 *   {managerAgentId} → seed-ids.managerAgentId (manager agent, Ada)
 *   {projectId}    → seed-ids.projectId
 *   {goalId}       → seed-ids.goalId
 *   {routineId}    → seed-ids.routineId
 *   {issueId}      → seed-ids.issueId
 *   {workspaceId}  → seed-ids.workspaceId
 */

import { COMPANY_PREFIX } from "./config.mjs";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** The list of all seed-id token names (anything that may be null). */
const ID_TOKENS = [
  "agentId",
  "managerAgentId",
  "projectId",
  "goalId",
  "routineId",
  "issueId",
  "workspaceId",
];

/**
 * Substitutes route tokens from config and seed ids.
 * Returns null if a required id token is present in the template but its value
 * is null/undefined in `ids`.
 *
 * @param {{ route: string }} target
 * @param {Record<string, string|null>} ids  — the parsed .seed-ids.json object
 * @returns {string|null}
 */
export function resolveRoute(target, ids) {
  let route = target.route;

  // The company issuePrefix is auto-derived server-side (first 3 uppercase
  // alpha chars of the name, e.g. "Acme Robotics" → "ACM") and cannot be set
  // via REST, so the real value is discovered at seed time and written to
  // .seed-ids.json as `companyPrefix`. Prefer it; fall back to the configured
  // default only when no seed file is present (e.g. dry inspection).
  const prefix = ids?.companyPrefix || COMPANY_PREFIX;
  route = route.replaceAll("{prefix}", prefix);

  // Dynamic id tokens — return null if the template needs one but it is missing.
  for (const key of ID_TOKENS) {
    const placeholder = `{${key}}`;
    if (route.includes(placeholder)) {
      const value = ids?.[key];
      if (!value) return null;
      route = route.replaceAll(placeholder, value);
    }
  }

  return route;
}

// ── Capture targets ──────────────────────────────────────────────────────────
// Sourced from SCREENSHOTS_TODO.md route tables and cross-walked against the
// existing registry.json entries.  Every entry that has a knowable URL appears
// here; entries that require interactive clicks (tab switching, dialog opening)
// are noted with a comment but are still included with their base route so
// Playwright can at least land on the right page.

export const CAPTURE_TARGETS = [
  // ── Company settings ───────────────────────────────────────────────────────
  {
    name: "company/settings",
    route: "/{prefix}/company/settings",
    dependsOn: ["ui/src/pages/CompanySettings.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "company/access",
    route: "/{prefix}/company/settings/access",
    dependsOn: ["ui/src/pages/CompanyAccess.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "company/invites",
    route: "/{prefix}/company/settings/invites",
    dependsOn: ["ui/src/pages/CompanyInvites.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "company/join-requests",
    route: "/{prefix}/inbox/requests",
    dependsOn: ["ui/src/pages/Inbox.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "company/export",
    route: "/{prefix}/company/export",
    dependsOn: ["ui/src/pages/CompanyExport.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "company/import",
    route: "/{prefix}/company/import",
    dependsOn: ["ui/src/pages/CompanyImport.tsx"],
    themes: ["light", "dark"],
  },

  // ── Instance settings ──────────────────────────────────────────────────────
  {
    name: "settings/profile",
    route: "/instance/settings/profile",
    dependsOn: ["ui/src/pages/ProfileSettings.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "settings/instance-general",
    route: "/instance/settings/general",
    dependsOn: ["ui/src/pages/InstanceGeneralSettings.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "settings/instance-access",
    route: "/instance/settings/access",
    dependsOn: ["ui/src/pages/InstanceAccess.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "settings/scheduler-heartbeats",
    route: "/instance/settings/heartbeats",
    dependsOn: ["ui/src/pages/InstanceSettings.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "settings/experimental",
    route: "/instance/settings/experimental",
    dependsOn: ["ui/src/pages/InstanceExperimentalSettings.tsx"],
    themes: ["light", "dark"],
  },

  // ── Plugins ────────────────────────────────────────────────────────────────
  {
    name: "plugins/list",
    route: "/instance/settings/plugins",
    dependsOn: ["ui/src/pages/PluginManager.tsx"],
    themes: ["light", "dark"],
  },
  // install dialog — same base route; manual click for the dialog open is out
  // of scope for the automated batch, but the base page is captured.
  {
    name: "plugins/install",
    route: "/instance/settings/plugins",
    dependsOn: ["ui/src/pages/PluginManager.tsx"],
    themes: ["light", "dark"],
    wait: 1500, // extra settle to allow plugin list to render
  },
  {
    name: "plugins/detail",
    route: "/instance/settings/plugins",
    dependsOn: ["ui/src/pages/PluginPage.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "plugins/settings",
    route: "/instance/settings/plugins",
    dependsOn: ["ui/src/pages/PluginSettings.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "plugins/jobs-log",
    route: "/instance/settings/plugins",
    dependsOn: ["ui/src/pages/PluginSettings.tsx"],
    themes: ["light", "dark"],
  },

  // ── Agents ─────────────────────────────────────────────────────────────────
  {
    name: "agents/list",
    route: "/{prefix}/agents/all",
    dependsOn: ["ui/src/pages/Agents.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "agents/new",
    route: "/{prefix}/agents/new",
    dependsOn: ["ui/src/pages/Agents.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "agents/dashboard",
    route: "/{prefix}/agents/{agentId}/dashboard",
    dependsOn: ["ui/src/pages/AgentDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "agents/instructions",
    route: "/{prefix}/agents/{agentId}/instructions",
    dependsOn: ["ui/src/pages/AgentDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "agents/skills",
    route: "/{prefix}/agents/{agentId}/skills",
    dependsOn: ["ui/src/pages/AgentDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "agents/configuration",
    route: "/{prefix}/agents/{agentId}/configuration",
    dependsOn: ["ui/src/pages/AgentDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "agents/runs",
    route: "/{prefix}/agents/{agentId}/runs",
    dependsOn: ["ui/src/pages/AgentDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "agents/budget",
    route: "/{prefix}/agents/{agentId}/budget",
    dependsOn: ["ui/src/pages/AgentDetail.tsx"],
    themes: ["light", "dark"],
  },

  // ── Costs ──────────────────────────────────────────────────────────────────
  // Costs tabs are React-state (not URL) — all land on /{prefix}/costs but the
  // tab names are used to distinguish the screenshots.  Automated capture
  // will only get the default Overview tab; remaining tabs need manual interaction.
  {
    name: "costs/overview",
    route: "/{prefix}/costs",
    dependsOn: ["ui/src/pages/Costs.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "costs/budgets",
    route: "/{prefix}/costs",
    dependsOn: ["ui/src/pages/Costs.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "costs/providers",
    route: "/{prefix}/costs",
    dependsOn: ["ui/src/pages/Costs.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "costs/billers",
    route: "/{prefix}/costs",
    dependsOn: ["ui/src/pages/Costs.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "costs/finance",
    route: "/{prefix}/costs",
    dependsOn: ["ui/src/pages/Costs.tsx"],
    themes: ["light", "dark"],
  },

  // ── Issues & inbox ─────────────────────────────────────────────────────────
  {
    name: "issues/list",
    route: "/{prefix}/issues",
    dependsOn: ["ui/src/pages/IssueDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "issues/inbox",
    route: "/{prefix}/inbox/mine",
    dependsOn: ["ui/src/pages/Inbox.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "issues/inbox-unread",
    route: "/{prefix}/inbox/unread",
    dependsOn: ["ui/src/pages/Inbox.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "issues/inbox-requests",
    route: "/{prefix}/inbox/requests",
    dependsOn: ["ui/src/pages/Inbox.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "issues/detail-chat",
    route: "/{prefix}/issues/{issueId}",
    dependsOn: ["ui/src/pages/IssueDetail.tsx"],
    themes: ["light", "dark"],
  },
  // Activity tab — same route, manual tab click needed; captured as a separate target.
  {
    name: "issues/detail-activity",
    route: "/{prefix}/issues/{issueId}",
    dependsOn: ["ui/src/pages/IssueDetail.tsx"],
    themes: ["light", "dark"],
  },

  // ── Projects ───────────────────────────────────────────────────────────────
  {
    name: "projects/list",
    route: "/{prefix}/projects",
    dependsOn: ["ui/src/pages/Projects.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "projects/overview",
    route: "/{prefix}/projects/{projectId}/overview",
    dependsOn: ["ui/src/pages/ProjectDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "projects/issues",
    route: "/{prefix}/projects/{projectId}/issues",
    dependsOn: ["ui/src/pages/ProjectDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "projects/workspaces",
    route: "/{prefix}/projects/{projectId}/workspaces",
    dependsOn: ["ui/src/pages/ProjectDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "projects/configuration",
    route: "/{prefix}/projects/{projectId}/configuration",
    dependsOn: ["ui/src/pages/ProjectDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "projects/budget",
    route: "/{prefix}/projects/{projectId}/budget",
    dependsOn: ["ui/src/pages/ProjectDetail.tsx"],
    themes: ["light", "dark"],
  },

  // ── Goals ──────────────────────────────────────────────────────────────────
  {
    name: "goals/list",
    route: "/{prefix}/goals",
    dependsOn: ["ui/src/pages/Goals.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "goals/detail",
    route: "/{prefix}/goals/{goalId}",
    dependsOn: ["ui/src/pages/GoalDetail.tsx"],
    themes: ["light", "dark"],
  },

  // ── Routines ───────────────────────────────────────────────────────────────
  {
    name: "routines/list",
    route: "/{prefix}/routines",
    dependsOn: ["ui/src/pages/Routines.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "routines/detail",
    route: "/{prefix}/routines/{routineId}",
    dependsOn: ["ui/src/pages/RoutineDetail.tsx"],
    themes: ["light", "dark"],
  },

  // ── Execution workspaces ───────────────────────────────────────────────────
  {
    name: "workspaces/configuration",
    route: "/{prefix}/execution-workspaces/{workspaceId}/configuration",
    dependsOn: ["ui/src/pages/ExecutionWorkspaceDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "workspaces/runtime-logs",
    route: "/{prefix}/execution-workspaces/{workspaceId}/runtime-logs",
    dependsOn: ["ui/src/pages/ExecutionWorkspaceDetail.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "workspaces/issues",
    route: "/{prefix}/execution-workspaces/{workspaceId}/issues",
    dependsOn: ["ui/src/pages/ExecutionWorkspaceDetail.tsx"],
    themes: ["light", "dark"],
  },

  // ── Adapters ───────────────────────────────────────────────────────────────
  {
    name: "adapters/list",
    route: "/instance/settings/adapters",
    dependsOn: ["ui/src/pages/AdapterManager.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "adapters/install",
    route: "/instance/settings/adapters",
    dependsOn: ["ui/src/pages/AdapterManager.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "adapters/detail",
    route: "/instance/settings/adapters",
    dependsOn: ["ui/src/pages/AdapterManager.tsx"],
    themes: ["light", "dark"],
  },

  // ── Org chart ──────────────────────────────────────────────────────────────
  {
    name: "org/chart",
    route: "/{prefix}/org",
    dependsOn: ["ui/src/pages/OrgChart.tsx"],
    themes: ["light", "dark"],
  },

  // ── Skills ─────────────────────────────────────────────────────────────────
  {
    name: "skills/list",
    route: "/{prefix}/skills",
    dependsOn: ["ui/src/pages/CompanySkills.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "skills/add-skill-dialog",
    route: "/{prefix}/skills",
    dependsOn: ["ui/src/pages/CompanySkills.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "skills/add-skill-dialog-confirm",
    route: "/{prefix}/skills",
    dependsOn: ["ui/src/pages/CompanySkills.tsx"],
    themes: ["light", "dark"],
  },
  {
    name: "skills/file-inventory",
    route: "/{prefix}/skills",
    dependsOn: ["ui/src/pages/CompanySkills.tsx"],
    themes: ["light", "dark"],
  },

  // ── CLI auth & board claim ─────────────────────────────────────────────────
  // These require dynamic IDs generated at demo time. The tokens are not in
  // seed-ids.json (they are ephemeral CLI interactions) — capture is skipped
  // when the IDs are absent from the seed file.
  // For now they are excluded from CAPTURE_TARGETS (no automated path).
  // Add them manually or extend seed.mjs to generate them if needed.
];
