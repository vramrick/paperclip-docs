#!/usr/bin/env node
// Self-contained test runner for the three sync helper scripts.
// No test framework: spawns each script with cwd set to a tmpdir fixture
// where ROOT (computed from import.meta.url as <tmp>/scripts/sync/../..) is the tmpdir.
//
// Usage: node scripts/sync/test.mjs

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync } from "node:fs";
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

console.log("");
console.log(`Results: ${pass} passed, ${fail} failed.`);
if (fail > 0) {
  for (const { name, error } of failures) {
    console.log(`\n- ${name}\n  ${error.stack || error.message}`);
  }
  process.exit(1);
}
process.exit(0);
