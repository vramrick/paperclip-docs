/**
 * seed.mjs — create demo data on a running Paperclip instance so the
 * screenshot pipeline has realistic content to capture.
 *
 * Contract: scripts/screenshots/README (shared module contract).
 *
 * ── Endpoint evidence ────────────────────────────────────────────────────────
 *   POST   /api/companies
 *     schema  packages/shared/src/validators/company.ts:16  (createCompanySchema)
 *     route   server/src/routes/companies.ts:291
 *     body    { name, description?, budgetMonthlyCents? }
 *     note    issuePrefix is AUTO-DERIVED (first 3 uppercase alpha chars of name)
 *             and cannot be set via REST.  "Acme Robotics" → prefix "ACM", not
 *             "ACME".  The actual prefix returned by the API is written to
 *             .seed-ids.json as `companyPrefix` so routes.mjs can resolve
 *             {prefix} tokens correctly at runtime.
 *
 *   GET    /api/companies
 *     route   server/src/routes/companies.ts (list handler)
 *     returns array; used for idempotency look-up
 *
 *   GET    /api/companies/:companyId/agents
 *     used for idempotency look-up
 *
 *   POST   /api/companies/:companyId/agents
 *     schema  packages/shared/src/validators/agent.ts:66  (createAgentSchema)
 *     route   server/src/routes/agents.ts:2123
 *     body    { name, role?, adapterType, adapterConfig?, reportsTo?, budgetMonthlyCents? }
 *     note    requireBoardApprovalForNewAgents must be false (default for new companies)
 *
 *   POST   /api/companies/:companyId/projects
 *     schema  packages/shared/src/validators/project.ts:113  (createProjectSchema)
 *     route   server/src/routes/projects.ts:118
 *     body    { name, description?, status?, goalIds? }
 *
 *   POST   /api/companies/:companyId/goals
 *     schema  packages/shared/src/validators/goal.ts:4  (createGoalSchema)
 *     route   server/src/routes/goals.ts:32
 *     body    { title, description?, level?, status?, ownerAgentId? }
 *
 *   POST   /api/companies/:companyId/issues
 *     schema  packages/shared/src/validators/issue.ts:371+399  (createIssueSchema)
 *     route   server/src/routes/issues.ts:3505
 *     body    { title, description?, status?, priority?, assigneeAgentId?, projectId?, goalId? }
 *
 *   POST   /api/companies/:companyId/routines
 *     schema  packages/shared/src/validators/routine.ts:52  (createRoutineSchema)
 *     route   server/src/routes/routines.ts:96
 *     body    { title, description?, assigneeAgentId?, priority?, status? }
 *
 *   POST   /api/projects/:id/workspaces
 *     schema  packages/shared/src/validators/project.ts:84  (createProjectWorkspaceSchema)
 *     route   server/src/routes/projects.ts:258
 *     body    { name?, sourceType?, cwd? }  (requires cwd or repoUrl)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { writeFileSync } from "node:fs";
import { BASE_URL, COMPANY_NAME, SEED_IDS_PATH } from "./config.mjs";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Thin fetch wrapper.  In local_trusted mode every request is auto-authorized
 * as instance admin — no auth headers needed.
 */
async function api(method, path, body, baseUrl) {
  const url = `${baseUrl}${path}`;
  const init = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "(unreadable body)");
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

const get  = (path, base) => api("GET",   path, undefined, base);
const post = (path, body, base) => api("POST",  path, body, base);

// ── Main seed function ────────────────────────────────────────────────────────

/**
 * Create (or reuse) demo data and return the ids object.
 * Also writes `.seed-ids.json` next to this file.
 *
 * @param {{ baseUrl?: string }} [opts]
 * @returns {Promise<object>} ids
 */
export default async function seed({ baseUrl = BASE_URL } = {}) {
  console.log(`[seed] targeting ${baseUrl}`);

  // ── 1. Company ──────────────────────────────────────────────────────────────
  //
  // Look up existing companies first so re-runs are idempotent.
  // The issuePrefix is auto-derived server-side (first 3 uppercase-alpha chars
  // of the name, then a suffix for uniqueness).  We read it back and store it
  // as `companyPrefix` so routes.mjs can resolve {prefix} tokens.

  let company;
  const existingCompanies = await get("/api/companies", baseUrl);
  company = existingCompanies.find((c) => c.name === COMPANY_NAME);

  if (company) {
    console.log(`[seed] reusing company "${company.name}" (${company.id}), prefix=${company.issuePrefix}`);
  } else {
    company = await post(
      "/api/companies",
      {
        name: COMPANY_NAME,
        description: "Demo company used by the screenshot pipeline.",
      },
      baseUrl,
    );
    console.log(`[seed] created company "${company.name}" (${company.id}), prefix=${company.issuePrefix}`);
  }

  const companyId     = company.id;
  const companyPrefix = company.issuePrefix; // e.g. "ACM" auto-derived from "Acme Robotics"

  // ── 2. Agents ───────────────────────────────────────────────────────────────
  //
  // Create a manager agent "Ada" (role=ceo) and a worker "Bob" (role=general,
  // reportsTo=Ada).  Use adapterType="process" — the cheapest built-in adapter
  // that doesn't require credentials.  Idempotent: skip if already present.
  //
  // Route: POST /api/companies/:companyId/agents  (agents.ts:2123)
  // Schema: createAgentSchema  (agent.ts:66)

  const existingAgents = await get(`/api/companies/${companyId}/agents`, baseUrl);

  let managerAgent = existingAgents.find((a) => a.name === "Ada");
  if (managerAgent) {
    console.log(`[seed] reusing manager agent "Ada" (${managerAgent.id})`);
  } else {
    managerAgent = await post(
      `/api/companies/${companyId}/agents`,
      {
        name: "Ada",
        role: "ceo",
        title: "Chief Executive Officer",
        adapterType: "process",
        adapterConfig: {},
      },
      baseUrl,
    );
    console.log(`[seed] created manager agent "Ada" (${managerAgent.id})`);
  }

  let workerAgent = existingAgents.find((a) => a.name === "Bob");
  if (workerAgent) {
    console.log(`[seed] reusing worker agent "Bob" (${workerAgent.id})`);
  } else {
    workerAgent = await post(
      `/api/companies/${companyId}/agents`,
      {
        name: "Bob",
        role: "general",
        title: "Software Engineer",
        adapterType: "process",
        adapterConfig: {},
        reportsTo: managerAgent.id,
      },
      baseUrl,
    );
    console.log(`[seed] created worker agent "Bob" (${workerAgent.id})`);
  }

  const managerAgentId = managerAgent.id;
  const agentId        = workerAgent.id;

  // ── 3. Goal ─────────────────────────────────────────────────────────────────
  //
  // Route: POST /api/companies/:companyId/goals  (goals.ts:32)
  // Schema: createGoalSchema  (goal.ts:4)
  // Fields: title, description?, level?, status?, ownerAgentId?

  let goalId = null;
  try {
    const existingGoals = await get(`/api/companies/${companyId}/goals`, baseUrl);
    let goal = existingGoals.find?.((g) => g.title === "Launch v1");
    if (!goal && Array.isArray(existingGoals.items)) {
      goal = existingGoals.items.find((g) => g.title === "Launch v1");
    }

    if (goal) {
      console.log(`[seed] reusing goal "Launch v1" (${goal.id})`);
      goalId = goal.id;
    } else {
      const created = await post(
        `/api/companies/${companyId}/goals`,
        {
          title: "Launch v1",
          description: "Ship the first public release of the product.",
          level: "goal",
          status: "planned",
          ownerAgentId: managerAgentId,
        },
        baseUrl,
      );
      goalId = created.id;
      console.log(`[seed] created goal "Launch v1" (${goalId})`);
    }
  } catch (err) {
    console.warn(`[seed] goal creation failed (non-fatal): ${err.message}`);
    goalId = null;
  }

  // ── 4. Project ──────────────────────────────────────────────────────────────
  //
  // Route: POST /api/companies/:companyId/projects  (projects.ts:118)
  // Schema: createProjectSchema  (project.ts:113)
  // Fields: name, description?, status?, goalIds?, leadAgentId?

  let projectId = null;
  try {
    const existingProjects = await get(`/api/companies/${companyId}/projects`, baseUrl);
    const projectList = Array.isArray(existingProjects)
      ? existingProjects
      : (existingProjects.items ?? []);
    let project = projectList.find((p) => p.name === "Website");

    if (project) {
      console.log(`[seed] reusing project "Website" (${project.id})`);
      projectId = project.id;
    } else {
      const created = await post(
        `/api/companies/${companyId}/projects`,
        {
          name: "Website",
          description: "Company marketing website.",
          status: "active",
          ...(goalId ? { goalIds: [goalId] } : {}),
          leadAgentId: managerAgentId,
        },
        baseUrl,
      );
      projectId = created.id;
      console.log(`[seed] created project "Website" (${projectId})`);
    }
  } catch (err) {
    console.warn(`[seed] project creation failed (non-fatal): ${err.message}`);
    projectId = null;
  }

  // ── 5. Issues ───────────────────────────────────────────────────────────────
  //
  // Three issues with mixed statuses to make list views interesting.
  //
  // Route: POST /api/companies/:companyId/issues  (issues.ts:3505)
  // Schema: createIssueSchema  (issue.ts:399)
  // Fields: title, description?, status?, priority?, assigneeAgentId?, projectId?, goalId?

  let issueId = null;
  const issueDefs = [
    {
      title: "Design the homepage hero section",
      description: "Create wireframes and hi-fi mockups for the marketing homepage.",
      status: "backlog",
      priority: "high",
      assigneeAgentId: agentId,
    },
    {
      title: "Set up CI/CD pipeline",
      description: "Configure GitHub Actions for lint, test, and deploy.",
      status: "in_progress",
      priority: "medium",
      assigneeAgentId: agentId,
    },
    {
      title: "Write onboarding docs",
      description: "Draft getting-started guide for new users.",
      status: "done",
      priority: "low",
      assigneeAgentId: managerAgentId,
    },
  ];

  try {
    const existingIssues = await get(`/api/companies/${companyId}/issues`, baseUrl);
    const issueList = Array.isArray(existingIssues)
      ? existingIssues
      : (existingIssues.items ?? []);

    for (const def of issueDefs) {
      const existing = issueList.find((i) => i.title === def.title);
      if (existing) {
        if (!issueId) issueId = existing.id;
        console.log(`[seed] reusing issue "${existing.title}" (${existing.id})`);
        continue;
      }
      const created = await post(
        `/api/companies/${companyId}/issues`,
        {
          ...def,
          ...(projectId ? { projectId } : {}),
          ...(goalId    ? { goalId }    : {}),
        },
        baseUrl,
      );
      if (!issueId) issueId = created.id;
      console.log(`[seed] created issue "${created.title}" (${created.id})`);
    }
  } catch (err) {
    console.warn(`[seed] issue creation failed (non-fatal): ${err.message}`);
    issueId = null;
  }

  // ── 6. Routine (best-effort) ─────────────────────────────────────────────────
  //
  // Route: POST /api/companies/:companyId/routines  (routines.ts:96)
  // Schema: createRoutineSchema  (routine.ts:52)
  // Fields: title, description?, assigneeAgentId?, priority?, status?

  let routineId = null;
  try {
    const existingRoutines = await get(`/api/companies/${companyId}/routines`, baseUrl);
    const routineList = Array.isArray(existingRoutines)
      ? existingRoutines
      : (existingRoutines.items ?? []);
    let routine = routineList.find((r) => r.title === "Daily standup");

    if (routine) {
      console.log(`[seed] reusing routine "Daily standup" (${routine.id})`);
      routineId = routine.id;
    } else {
      const created = await post(
        `/api/companies/${companyId}/routines`,
        {
          title: "Daily standup",
          description: "Automated daily status summary for the team.",
          assigneeAgentId: managerAgentId,
          priority: "medium",
          status: "active",
        },
        baseUrl,
      );
      routineId = created.id;
      console.log(`[seed] created routine "Daily standup" (${routineId})`);
    }
  } catch (err) {
    console.warn(`[seed] routine creation failed (non-fatal): ${err.message}`);
    routineId = null;
  }

  // ── 7. Workspace (best-effort) ───────────────────────────────────────────────
  //
  // Requires an existing project.  Creates a simple local-path workspace.
  //
  // Route: POST /api/projects/:id/workspaces  (projects.ts:258)
  // Schema: createProjectWorkspaceSchema  (project.ts:84)
  // Fields: name?, sourceType?, cwd?  (requires cwd or repoUrl)

  let workspaceId = null;
  if (projectId) {
    try {
      const projectDetail = await get(`/api/projects/${projectId}`, baseUrl);
      const existingWs = Array.isArray(projectDetail.workspaces)
        ? projectDetail.workspaces.find((w) => w.name === "main")
        : null;

      if (existingWs) {
        console.log(`[seed] reusing workspace "main" (${existingWs.id})`);
        workspaceId = existingWs.id;
      } else {
        const created = await post(
          `/api/projects/${projectId}/workspaces`,
          {
            name: "main",
            sourceType: "local_path",
            cwd: "/tmp/acme-website",
            isPrimary: true,
          },
          baseUrl,
        );
        workspaceId = created.id;
        console.log(`[seed] created workspace "main" (${workspaceId})`);
      }
    } catch (err) {
      console.warn(`[seed] workspace creation failed (non-fatal): ${err.message}`);
      workspaceId = null;
    }
  }

  // ── 8. Persist ids ───────────────────────────────────────────────────────────

  const ids = {
    companyPrefix,   // actual issuePrefix from API (auto-derived, not always "ACME")
    companyId,
    managerAgentId,
    agentId,
    projectId,
    goalId,
    routineId,
    issueId,
    workspaceId,
  };

  writeFileSync(SEED_IDS_PATH, JSON.stringify(ids, null, 2) + "\n", "utf-8");
  console.log(`[seed] wrote ids to ${SEED_IDS_PATH}`);
  console.log("[seed] done:", JSON.stringify(ids, null, 2));

  return ids;
}

// ── CLI entry-point ───────────────────────────────────────────────────────────

// Detect direct invocation: `node scripts/screenshots/seed.mjs [--base-url <url>]`
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const urlFlagIdx = process.argv.indexOf("--base-url");
  const baseUrl    = urlFlagIdx !== -1 ? process.argv[urlFlagIdx + 1] : BASE_URL;

  seed({ baseUrl }).catch((err) => {
    console.error("[seed] fatal:", err.message);
    process.exit(1);
  });
}
