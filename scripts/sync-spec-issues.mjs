#!/usr/bin/env node
/**
 * sync-spec-issues.mjs
 *
 * Turn a Kiro spec's tasks.md into GitHub issues, one issue per task.
 * Idempotent by issue title (re-running won't create duplicates) and dry-run
 * by default. Requires the GitHub CLI (`gh`) authenticated with repo access.
 *
 * Usage:
 *   node scripts/sync-spec-issues.mjs --spec <name> [--milestone "<title>"] [options]
 *
 * Options:
 *   --spec <name>          Spec folder under .kiro/specs/ (required)
 *   --milestone "<title>"  Milestone to attach = the phase / timeline bucket for this batch
 *                          (must already exist on GitHub; create it once per phase)
 *   --assignee <login>     Assign the created issues to a GitHub user. Repeatable, and/or
 *                          comma-separated (e.g. --assignee alice --assignee bob, or
 *                          --assignee alice,bob). Use @me to self-assign.
 *   --label <name>         Label to apply (default: spec-task; created if missing)
 *   --include-completed    Also create issues for tasks already checked off ([x])
 *   --create               Actually create issues (omit for a dry-run preview)
 *   -h, --help             Show this help
 *
 * Examples:
 *   npm run sync:issues -- --spec focusflow --milestone "Phase 1: Core API"
 *   npm run sync:issues -- --spec focusflow --milestone "Phase 1: Core API" --create
 *   npm run sync:issues -- --spec daily-goals --milestone "Phase 2" --assignee alice --create
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const USAGE = `Usage: node scripts/sync-spec-issues.mjs --spec <name> [--milestone "<title>"] [--assignee <login>] [--label <name>] [--include-completed] [--create]`;

function parseArgs(argv) {
  const args = {
    create: false,
    includeCompleted: false,
    label: "spec-task",
    assignees: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--spec":
        args.spec = argv[++i];
        break;
      case "--milestone":
        args.milestone = argv[++i];
        break;
      case "--assignee":
        // Repeatable and/or comma-separated: --assignee a --assignee b, or --assignee a,b
        args.assignees.push(
          ...String(argv[++i] ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        );
        break;
      case "--label":
        args.label = argv[++i];
        break;
      case "--create":
        args.create = true;
        break;
      case "--include-completed":
        args.includeCompleted = true;
        break;
      case "-h":
      case "--help":
        args.help = true;
        break;
      default:
        console.error(`Unknown argument: ${a}`);
        args.help = true;
    }
  }
  return args;
}

function fail(message) {
  console.error(`\nERROR: ${message}\n`);
  process.exit(1);
}

/** Parse top-level checkbox tasks out of a tasks.md document. */
function parseTasks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const taskRe = /^- \[( |x|X)\] (\d+)\.\s+(.*)$/;
  const tasks = [];
  let current = null;

  const flush = () => {
    if (current) {
      tasks.push(current);
      current = null;
    }
  };

  for (const line of lines) {
    const match = line.match(taskRe);
    if (match) {
      flush();
      current = {
        done: match[1].toLowerCase() === "x",
        number: Number(match[2]),
        title: match[3].trim(),
        details: [],
        requirements: [],
      };
      continue;
    }
    if (!current) continue;

    // A heading or horizontal rule ends the current task's block.
    if (/^(#{1,6}\s|---\s*$)/.test(line)) {
      flush();
      continue;
    }

    // Indented content belongs to the current task.
    if (/^\s+\S/.test(line)) {
      const text = line.trim().replace(/^-\s+/, "");
      const req = text.match(/Requirements?:\s*([^_]+)/i);
      if (req) {
        current.requirements = req[1]
          .split(",")
          .map((s) => s.trim().replace(/\.+$/, ""))
          .filter(Boolean);
      } else {
        current.details.push(text);
      }
    }
  }
  flush();
  return tasks;
}

function buildIssueTitle(spec, task) {
  return `[${spec}] ${task.number}. ${task.title}`;
}

function buildIssueBody(spec, task) {
  const requirements =
    task.requirements.length > 0 ? task.requirements.join(", ") : "see spec";
  const scope =
    task.details.length > 0
      ? task.details.map((d) => `- ${d}`).join("\n")
      : "- See the spec for full detail.";

  return [
    `> Auto-generated from \`.kiro/specs/${spec}/tasks.md\` (task ${task.number}) by \`scripts/sync-spec-issues.mjs\`.`,
    "",
    `**Spec:** \`.kiro/specs/${spec}\``,
    `**Task:** ${task.number}. ${task.title}`,
    `**Requirement IDs:** ${requirements}`,
    "",
    "## Scope",
    scope,
    "",
    "## Definition of done",
    "- [ ] Implemented per `structure.md` (pure domain logic, thin routes)",
    "- [ ] Unit + integration tests added and passing",
    "- [ ] `npm run lint`, `npm run build`, and `npm test` all green",
    `- [ ] The task ${task.number} checkbox in \`tasks.md\` is ticked in the PR`,
  ].join("\n");
}

function hasGhCli() {
  try {
    execFileSync("gh", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function existingIssueTitles() {
  const out = execFileSync(
    "gh",
    ["issue", "list", "--state", "all", "--limit", "1000", "--json", "title"],
    { encoding: "utf8" },
  );
  const parsed = JSON.parse(out);
  return new Set(parsed.map((issue) => issue.title));
}

function ensureLabel(label) {
  try {
    execFileSync(
      "gh",
      [
        "label",
        "create",
        label,
        "--description",
        "Implementation task derived from a Kiro spec",
        "--color",
        "1D76DB",
      ],
      { stdio: "ignore" },
    );
  } catch {
    // Label already exists or cannot be created here — safe to ignore.
  }
}

function createIssue(title, body, { milestone, label, assignees = [] }) {
  const args = ["issue", "create", "--title", title, "--body", body];
  if (milestone) args.push("--milestone", milestone);
  if (label) args.push("--label", label);
  for (const assignee of assignees) args.push("--assignee", assignee);
  return execFileSync("gh", args, { encoding: "utf8" }).trim();
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(USAGE);
    process.exit(0);
  }
  if (!args.spec) fail(`--spec is required.\n${USAGE}`);

  const tasksPath = join(".kiro", "specs", args.spec, "tasks.md");
  if (!existsSync(tasksPath)) {
    fail(`No tasks.md found at ${tasksPath}. Check the --spec name.`);
  }

  const allTasks = parseTasks(readFileSync(tasksPath, "utf8"));
  const tasks = allTasks.filter((t) => args.includeCompleted || !t.done);

  if (tasks.length === 0) {
    console.log(
      `No matching tasks in ${tasksPath}. ` +
        `${allTasks.length} task(s) found; use --include-completed to include done ones.`,
    );
    process.exit(0);
  }

  const mode = args.create ? "CREATE" : "DRY-RUN";
  console.log(`\n${mode}: ${tasks.length} task(s) from ${tasksPath}`);
  if (args.milestone) console.log(`Milestone: ${args.milestone}`);
  if (args.assignees.length)
    console.log(`Assignee(s): ${args.assignees.join(", ")}`);
  console.log("");

  // Duplicate detection needs gh. In create mode gh is mandatory.
  let existing = new Set();
  const ghAvailable = hasGhCli();
  if (args.create && !ghAvailable) {
    fail(
      "GitHub CLI (gh) not found. Install https://cli.github.com and run `gh auth login`.",
    );
  }
  if (ghAvailable) {
    try {
      existing = existingIssueTitles();
    } catch (error) {
      if (args.create) {
        fail(`Could not list existing issues via gh: ${error.message}`);
      }
      console.warn(
        "Warning: could not query existing issues (are you authenticated / in a repo?). " +
          "Duplicate detection is skipped in this preview.\n",
      );
    }
  } else {
    console.warn(
      "Note: gh not found, so duplicate detection is skipped in this dry-run.\n",
    );
  }

  if (args.create && args.label) ensureLabel(args.label);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const task of tasks) {
    const title = buildIssueTitle(args.spec, task);

    if (existing.has(title)) {
      console.log(`  skip (exists):  ${title}`);
      skipped++;
      continue;
    }

    if (!args.create) {
      console.log(`  would create:   ${title}`);
      created++;
      continue;
    }

    try {
      const url = createIssue(title, buildIssueBody(args.spec, task), {
        milestone: args.milestone,
        label: args.label,
        assignees: args.assignees,
      });
      console.log(`  created:        ${title}\n                  ${url}`);
      created++;
    } catch (error) {
      console.error(
        `  FAILED:         ${title}\n                  ${error.message}`,
      );
      failed++;
    }
  }

  console.log(
    `\nDone. ${args.create ? "created" : "would create"}=${created} skipped=${skipped}` +
      (failed ? ` failed=${failed}` : ""),
  );
  if (!args.create) {
    console.log("Re-run with --create to actually create these issues.\n");
  }
  if (failed) process.exit(1);
}

main();
