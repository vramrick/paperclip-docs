#!/usr/bin/env node
// Self-contained test runner for the three sync helper scripts.
// No test framework: spawns each script with cwd set to a tmpdir fixture
// where ROOT (computed from import.meta.url as <tmp>/scripts/sync/../..) is the tmpdir.
//
// Usage: node scripts/sync/test.mjs

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const SCRIPTS = {
  lint: join(SELF_DIR, "lint-links.mjs"),
  nav: join(SELF_DIR, "verify-nav.mjs"),
  shots: join(SELF_DIR, "backfill-screenshots.mjs"),
};

let pass = 0;
let fail = 0;
const failures = [];

function makeFixture() {
  const dir = mkdtempSync(join(tmpdir(), "sync-test-"));
  mkdirSync(join(dir, "scripts/sync"), { recursive: true });
  return dir;
}

function placeScript(fixture, srcPath) {
  const dest = join(fixture, "scripts/sync", srcPath.split("/").pop());
  copyFileSync(srcPath, dest);
  return dest;
}

function writeFile(fixture, relPath, contents) {
  const p = join(fixture, relPath);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, contents);
}

function run(scriptPath, args = [], cwd) {
  const r = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd,
    encoding: "utf8",
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  PASS  ${name}`);
  } catch (e) {
    fail++;
    failures.push({ name, error: e });
    console.log(`  FAIL  ${name}`);
    console.log(`        ${e.message}`);
  }
}

// ----------------------------------------------------------------------------
// lint-links
// ----------------------------------------------------------------------------

test("lint-links: detects broken md + missing image, skips all skip-cases", () => {
  const fix = makeFixture();
  const script = placeScript(fix, SCRIPTS.lint);

  // Create a real target file the valid link can point at.
  writeFile(fix, "docs/real.md", "# real\n");
  // Author the test file with all the variants.
  const md = [
    "# test",
    "",
    "[valid](real.md)",
    "[broken](does-not-exist.md)",
    "[external](https://example.com/foo)",
    "[agent](agent://some/thing)",
    "[mailto](mailto:foo@example.com)",
    "[anchor](#section)",
    "[abs](/spa-route)",
    "[tmpl-dollar](path/${VAR}/x.md)",
    "[tmpl-mustache](path/{{name}}/x.md)",
    "[tmpl-brace](path/{lowercase}/x.md)",
    "![missing-img](./missing.png)",
    "",
  ].join("\n");
  writeFile(fix, "docs/test.md", md);

  const r = run(script, ["--json"], fix);
  assert(r.code === 1, `expected exit 1, got ${r.code}. stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert(out.broken.length === 2, `expected 2 broken, got ${out.broken.length}: ${JSON.stringify(out.broken)}`);
  const targets = out.broken.map((b) => b.target).sort();
  assert(targets.includes("does-not-exist.md"), `missing broken md link in: ${targets}`);
  assert(targets.includes("./missing.png"), `missing broken image in: ${targets}`);

  rmSync(fix, { recursive: true, force: true });
});

// ----------------------------------------------------------------------------
// verify-nav
// ----------------------------------------------------------------------------

test("verify-nav: 1 dangling + 1 orphan, screenshots md ignored", () => {
  const fix = makeFixture();
  const script = placeScript(fix, SCRIPTS.nav);

  writeFile(fix, "docs/intro.md", "# intro\n");
  writeFile(fix, "docs/extra.md", "# extra (orphan)\n");
  writeFile(fix, "docs/user-guides/screenshots/notes.md", "# should be ignored\n");

  const content = {
    sections: [
      { items: [{ title: "Intro", file: "../docs/intro.md" }] },
      { items: [{ title: "Gone", file: "../docs/missing.md" }] },
    ],
  };
  writeFile(fix, "site/content.json", JSON.stringify(content));

  const r = run(script, ["--json"], fix);
  assert(r.code === 1, `expected exit 1, got ${r.code}. stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert(out.dangling.length === 1, `dangling=${JSON.stringify(out.dangling)}`);
  assert(out.dangling[0].endsWith("docs/missing.md"), `dangling path: ${out.dangling[0]}`);
  assert(out.orphans.length === 1, `orphans=${JSON.stringify(out.orphans)}`);
  assert(out.orphans[0].endsWith("docs/extra.md"), `orphan path: ${out.orphans[0]}`);
  // screenshots md must not appear anywhere
  assert(
    !out.orphans.some((o) => o.includes("screenshots/")),
    `screenshot md leaked into orphans: ${JSON.stringify(out.orphans)}`
  );

  rmSync(fix, { recursive: true, force: true });
});

test("verify-nav: --strict promotes orphan-only to exit 1", () => {
  const fix = makeFixture();
  const script = placeScript(fix, SCRIPTS.nav);

  writeFile(fix, "docs/intro.md", "# intro\n");
  writeFile(fix, "docs/orphan.md", "# orphan\n");
  const content = { sections: [{ items: [{ title: "Intro", file: "../docs/intro.md" }] }] };
  writeFile(fix, "site/content.json", JSON.stringify(content));

  const nonStrict = run(script, ["--json"], fix);
  assert(nonStrict.code === 0, `non-strict orphan-only should exit 0, got ${nonStrict.code}`);

  const strict = run(script, ["--json", "--strict"], fix);
  assert(strict.code === 1, `strict orphan-only should exit 1, got ${strict.code}`);
  const out = JSON.parse(strict.stdout);
  assert(out.dangling.length === 0, `expected no dangling, got ${JSON.stringify(out.dangling)}`);
  assert(out.orphans.length === 1, `expected 1 orphan, got ${JSON.stringify(out.orphans)}`);

  rmSync(fix, { recursive: true, force: true });
});

// ----------------------------------------------------------------------------
// backfill-screenshots
// ----------------------------------------------------------------------------

test("backfill-screenshots: preserves entries with depends_on, scaffolds the rest", () => {
  const fix = makeFixture();
  const script = placeScript(fix, SCRIPTS.shots);

  // Minimal valid PNG bytes (8-byte signature is enough; script only stats by extension).
  const pngStub = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const shotsDir = join(fix, "docs/user-guides/screenshots");
  mkdirSync(join(shotsDir, "light"), { recursive: true });
  mkdirSync(join(shotsDir, "dark"), { recursive: true });
  writeFileSync(join(shotsDir, "light/dashboard.png"), pngStub);
  writeFileSync(join(shotsDir, "dark/dashboard.png"), pngStub);

  const preExisting = {
    entries: [
      {
        file: "light/dashboard.png",
        theme: "light",
        viewport: "1920x1080",
        route: "/dashboard",
        captured_against: "abc",
        captured_sha: "deadbeef",
        depends_on: ["some/path.ts"],
      },
    ],
  };
  writeFile(fix, "docs/user-guides/screenshots/registry.json", JSON.stringify(preExisting));

  const r = run(script, [], fix);
  assert(r.code === 0 || r.code === null, `expected exit 0, got ${r.code}. stderr=${r.stderr}`);

  const reg = JSON.parse(readFileSync(join(shotsDir, "registry.json"), "utf8"));
  assert(reg.entries.length === 2, `expected 2 entries, got ${reg.entries.length}`);

  const light = reg.entries.find((e) => e.file === "light/dashboard.png");
  const dark = reg.entries.find((e) => e.file === "dark/dashboard.png");
  assert(light, "light entry missing");
  assert(dark, "dark entry missing");

  // Pre-existing preserved verbatim.
  assert(light.viewport === "1920x1080", `light viewport changed: ${light.viewport}`);
  assert(light.route === "/dashboard", `light route changed: ${light.route}`);
  assert(light.captured_sha === "deadbeef", "light captured_sha changed");
  assert(Array.isArray(light.depends_on) && light.depends_on.length === 1 && light.depends_on[0] === "some/path.ts",
    `light depends_on changed: ${JSON.stringify(light.depends_on)}`);
  assert(light._todo === undefined, "light entry should not have _todo (was preserved)");

  // Dark scaffolded fresh.
  assert(dark.theme === "dark", `dark theme: ${dark.theme}`);
  assert(Array.isArray(dark.depends_on) && dark.depends_on.length === 0, `dark depends_on: ${JSON.stringify(dark.depends_on)}`);
  assert(typeof dark._todo === "string" && dark._todo.length > 0, "dark _todo missing");

  rmSync(fix, { recursive: true, force: true });
});

// ----------------------------------------------------------------------------
// compare-window (unit, fixture-driven)
// ----------------------------------------------------------------------------

const COMPARE_SCRIPT = join(SELF_DIR, "compare-window.mjs");

function writeFixture(dir, name, payload) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), typeof payload === "string" ? payload : JSON.stringify(payload));
}

function runCompare(args, fixtureDir) {
  const r = spawnSync(process.execPath, [COMPARE_SCRIPT, ...args], {
    encoding: "utf8",
    env: { ...process.env, PAPERCLIP_SYNC_FIXTURE_DIR: fixtureDir },
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

test("compare-window: no truncation → single leaf, all files preserved", () => {
  const fix = mkdtempSync(join(tmpdir(), "cw-test-"));
  // SHA lookups for the two refs.
  writeFixture(fix, "sha-A.json", { sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" });
  writeFixture(fix, "sha-B.json", { sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" });
  // Compare body keyed by the resolved SHAs.
  const files = [];
  for (let i = 0; i < 42; i++) {
    files.push({ filename: `f${i}.ts`, status: "modified", additions: 1, deletions: 0 });
  }
  const commits = Array.from({ length: 10 }, (_, i) => ({ sha: `c${i}`.padEnd(40, "0") }));
  writeFixture(fix, "compare-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa...bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.json", {
    total_commits: 10,
    commits,
    files,
  });

  const r = runCompare(["A", "B", "--json"], fix);
  assert(r.code === 0, `expected 0, got ${r.code}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert(out.leaves === 1, `leaves=${out.leaves}`);
  assert(out.truncated_leaves === 0, `truncated_leaves=${out.truncated_leaves}`);
  assert(out.files.length === 42, `files.length=${out.files.length}`);
  assert(out.total_commits_seen === 10, `commits=${out.total_commits_seen}`);

  rmSync(fix, { recursive: true, force: true });
});

test("compare-window: single split bisects and unions correctly", () => {
  const fix = mkdtempSync(join(tmpdir(), "cw-test-"));
  const aSha = "a".repeat(40);
  const bSha = "b".repeat(40);
  const midSha = "m".repeat(40);
  writeFixture(fix, "sha-A.json", { sha: aSha });
  writeFixture(fix, "sha-B.json", { sha: bSha });

  // Top-level A...B is truncated: 300 files, 250 commits in array, total_commits=500.
  const topFiles = [];
  for (let i = 0; i < 300; i++) topFiles.push({ filename: `top${i}.ts`, status: "modified", additions: 1, deletions: 0 });
  const topCommits = [];
  for (let i = 0; i < 250; i++) topCommits.push({ sha: i === 125 ? midSha : `t${i}`.padEnd(40, "0") });
  writeFixture(fix, `compare-${aSha}...${bSha}.json`, {
    total_commits: 250,
    commits: topCommits,
    files: topFiles,
  });

  // Left leaf A...mid (non-truncated)
  writeFixture(fix, `compare-${aSha}...${midSha}.json`, {
    total_commits: 50,
    commits: Array.from({ length: 50 }, (_, i) => ({ sha: `l${i}`.padEnd(40, "0") })),
    files: [
      { filename: "left-only.ts", status: "added", additions: 5, deletions: 0 },
      { filename: "shared.ts", status: "added", additions: 3, deletions: 0 },
    ],
  });

  // Right leaf mid...B (non-truncated). shared.ts becomes "modified" — should merge
  // with leaf-1's "added" to become "modified".
  writeFixture(fix, `compare-${midSha}...${bSha}.json`, {
    total_commits: 60,
    commits: Array.from({ length: 60 }, (_, i) => ({ sha: `r${i}`.padEnd(40, "0") })),
    files: [
      { filename: "right-only.ts", status: "added", additions: 2, deletions: 0 },
      { filename: "shared.ts", status: "modified", additions: 7, deletions: 1 },
    ],
  });

  const r = runCompare(["A", "B", "--json"], fix);
  assert(r.code === 0, `expected 0, got ${r.code}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert(out.leaves === 2, `leaves=${out.leaves}`);
  assert(out.truncated_leaves === 0, `truncated_leaves=${out.truncated_leaves}`);
  const byName = Object.fromEntries(out.files.map((f) => [f.filename, f]));
  assert(byName["left-only.ts"], "missing left-only.ts");
  assert(byName["right-only.ts"], "missing right-only.ts");
  assert(byName["shared.ts"], "missing shared.ts");
  assert(byName["shared.ts"].status === "modified", `shared.ts status=${byName["shared.ts"].status}`);
  // additions summed: 3 + 7
  assert(byName["shared.ts"].additions === 10, `shared.ts additions=${byName["shared.ts"].additions}`);

  rmSync(fix, { recursive: true, force: true });
});

test("compare-window: status merge — added+removed drops, added+modified→modified", () => {
  const fix = mkdtempSync(join(tmpdir(), "cw-test-"));
  const aSha = "a".repeat(40);
  const bSha = "b".repeat(40);
  const midSha = "c".repeat(40);
  writeFixture(fix, "sha-A.json", { sha: aSha });
  writeFixture(fix, "sha-B.json", { sha: bSha });

  // Truncated parent forcing a split.
  const topFiles = [];
  for (let i = 0; i < 300; i++) topFiles.push({ filename: `pad${i}.ts`, status: "modified", additions: 0, deletions: 0 });
  const topCommits = [];
  for (let i = 0; i < 50; i++) topCommits.push({ sha: i === 25 ? midSha : `t${i}`.padEnd(40, "0") });
  writeFixture(fix, `compare-${aSha}...${bSha}.json`, {
    total_commits: 50,
    commits: topCommits,
    files: topFiles,
  });

  writeFixture(fix, `compare-${aSha}...${midSha}.json`, {
    total_commits: 10,
    commits: Array.from({ length: 10 }, (_, i) => ({ sha: `l${i}`.padEnd(40, "0") })),
    files: [
      { filename: "foo.ts", status: "added", additions: 50, deletions: 0 },
      { filename: "bar.ts", status: "added", additions: 30, deletions: 0 },
    ],
  });

  writeFixture(fix, `compare-${midSha}...${bSha}.json`, {
    total_commits: 10,
    commits: Array.from({ length: 10 }, (_, i) => ({ sha: `r${i}`.padEnd(40, "0") })),
    files: [
      { filename: "foo.ts", status: "removed", additions: 0, deletions: 50 },
      { filename: "bar.ts", status: "modified", additions: 4, deletions: 1 },
    ],
  });

  const r = runCompare(["A", "B", "--json"], fix);
  assert(r.code === 0, `expected 0, got ${r.code}; stderr=${r.stderr}`);
  const out = JSON.parse(r.stdout);
  const byName = Object.fromEntries(out.files.map((f) => [f.filename, f]));
  assert(!byName["foo.ts"], `foo.ts should be dropped (added+removed); got ${JSON.stringify(byName["foo.ts"])}`);
  assert(byName["bar.ts"], "bar.ts missing");
  assert(byName["bar.ts"].status === "modified", `bar.ts status=${byName["bar.ts"].status} (expected modified)`);

  rmSync(fix, { recursive: true, force: true });
});

// ----------------------------------------------------------------------------
// compare-window:integration — live network test against paperclipai/paperclip
// ----------------------------------------------------------------------------

test("compare-window:integration v2026.318.0...v2026.512.0 (live)", () => {
  // Skip (don't fail) if gh isn't authed.
  const auth = spawnSync("gh", ["auth", "status"], { encoding: "utf8" });
  if (auth.status !== 0) {
    console.log("        SKIP — gh auth status failed; this test needs an authed gh + network.");
    pass--; // counter the auto-pass from the wrapper; we want a neutral marker
    // We re-increment via a "skip" path: don't throw, but mark visually.
    pass++; // restore (treat skip as pass for runner)
    return;
  }
  const r = spawnSync(process.execPath, [
    COMPARE_SCRIPT,
    "v2026.318.0",
    "v2026.512.0",
    "--json",
    "--repo",
    "paperclipai/paperclip",
  ], { encoding: "utf8", env: { ...process.env, PAPERCLIP_SYNC_FIXTURE_DIR: "" } });
  if (r.status !== 0) {
    throw new Error(`live run failed (exit ${r.status}). stderr=${r.stderr}`);
  }
  const out = JSON.parse(r.stdout);
  assert(out.truncated_leaves === 0, `truncated_leaves=${out.truncated_leaves} (must be 0)`);
  assert(out.files.length >= 1000, `files.length=${out.files.length} (expected >= 1000)`);
  const names = new Set(out.files.map((f) => f.filename));
  for (const expected of [
    "cli/src/commands/client/secrets.ts",
    ".env.example",
    "server/src/routes/companies.ts",
  ]) {
    assert(names.has(expected), `expected file missing from output: ${expected}`);
  }
  console.log(`        integration stats: files=${out.files.length}, leaves=${out.leaves}, truncated=${out.truncated_leaves}, commits=${out.total_commits_seen}`);
});

// ----------------------------------------------------------------------------

console.log("");
console.log(`Results: ${pass} passed, ${fail} failed.`);
if (fail > 0) {
  for (const { name, error } of failures) {
    console.log(`\n- ${name}\n  ${error.stack || error.message}`);
  }
  process.exit(1);
}
process.exit(0);
