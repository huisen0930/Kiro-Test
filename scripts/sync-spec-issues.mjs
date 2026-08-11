#!/usr/bin/env node
/**
 * sync-spec-issues.mjs
 *
 * Turn a Kiro spec's tasks.md into GitHub issues, one issue per task, with
 * requirement IDs carried into the body for traceability. Idempotent by issue
 * title, so re-running it will not create duplicates.
 *
 * Usage:
 *   node scripts/sync-spec-issues.mjs --spec <name> [--milestone "<title>"] [--repo owner/name] [--create]
 *
 * Without --create it runs as a dry run and only prints the plan.
 * Requires the GitHub CLI (`gh`) authenticated with repo access.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');

const HELP = `Sync a Kiro spec's tasks.md into GitHub issues.

Options:
  --spec <name>          Spec folder under .kiro/specs (e.g. focusflow)   [required]
  --milestone "<title>"  Milestone to attach issues to (created if absent)
  --repo owner/name      Target repo (default: current repo via gh)
  --create               Actually create issues (default: dry run)
  -h, --help             Show this help
`;

function parseArgs(argv) {
  const args = { create: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--create') args.create = true;
    else if (a === '--spec') args.spec = argv[++i];
    else if (a === '--milestone') args.milestone = argv[++i];
    else if (a === '--repo') args.repo = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8' }).trim();
}

/** Parse task headers like `- [x] 9. Daily stats endpoint` plus their detail lines. */
function parseTasks(md) {
  const lines = md.split(/\r?\n/);
  const headerRe = /^- \[([ x\-~])\]\s*(\d+)\.\s+(.*)$/;
  const reqRe = /_Requirements:\s*(.+?)\.?_\s*$/;
  const tasks = [];
  let current = null;
  const flush = () => { if (current) { tasks.push(current); current = null; } };

  for (const line of lines) {
    const m = line.match(headerRe);
    if (m) {
      flush();
      current = { status: m[1], number: m[2], title: m[3].trim(), detail: [], requirements: '' };
      continue;
    }
    if (!current) continue;
    if (/^\s*---\s*$/.test(line) || /^#{1,6}\s/.test(line)) { flush(); continue; }
    const reqM = line.match(reqRe);
    if (reqM) current.requirements = reqM[1].trim();
    else if (line.trim()) current.detail.push(line.trim());
  }
  flush();
  return tasks;
}

const clean = (s) => s.replace(/`/g, '').trim();

function ensureMilestone(repo, title) {
  const list = JSON.parse(gh(['api', `repos/${repo}/milestones?state=all`]));
  const found = list.find((m) => m.title === title);
  if (found) return found.number;
  const created = JSON.parse(gh(['api', `repos/${repo}/milestones`, '-f', `title=${title}`, '-f', 'state=open']));
  return created.number;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.spec) {
    console.log(HELP);
    process.exit(args.spec ? 0 : 1);
  }

  const tasksPath = join(repoRoot, '.kiro', 'specs', args.spec, 'tasks.md');
  let md;
  try {
    md = readFileSync(tasksPath, 'utf8');
  } catch {
    console.error(`Could not read ${tasksPath}. Is --spec "${args.spec}" correct?`);
    process.exit(1);
  }

  const repo = args.repo || gh(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']);
  const tasks = parseTasks(md);
  if (tasks.length === 0) {
    console.error('No tasks found in tasks.md (expected lines like "- [ ] 1. Title").');
    process.exit(1);
  }

  const existing = JSON.parse(gh(['issue', 'list', '--repo', repo, '--state', 'all', '--limit', '300', '--json', 'title']));
  const existingTitles = new Set(existing.map((i) => i.title));

  console.log(`Spec:      ${args.spec}`);
  console.log(`Repo:      ${repo}`);
  console.log(`Milestone: ${args.milestone || '(none)'}`);
  console.log(`Mode:      ${args.create ? 'CREATE' : 'dry run (use --create to write)'}`);
  console.log(`Tasks:     ${tasks.length}\n`);

  if (args.create && args.milestone) ensureMilestone(repo, args.milestone);

  let created = 0, skipped = 0;
  for (const t of tasks) {
    const title = `Task ${t.number}: ${clean(t.title)}`;
    const statusLabel = { 'x': 'done', '-': 'in progress', '~': 'stretch', ' ': 'todo' }[t.status];

    if (existingTitles.has(title)) {
      console.log(`= skip (exists): ${title}`);
      skipped++;
      continue;
    }

    const body = [
      t.detail.join('\n') || '(see spec for detail)',
      '',
      `**Requirements covered:** ${t.requirements || 'n/a'}`,
      '',
      `Generated from \`.kiro/specs/${args.spec}/tasks.md\` (status: ${statusLabel}).`,
      'Traceability: requirement -> design -> task -> code.',
    ].join('\n');

    if (!args.create) {
      console.log(`+ would create: ${title}   [${statusLabel}]`);
      continue;
    }

    const createArgs = ['issue', 'create', '--repo', repo, '--title', title, '--body', body, '--label', 'spec'];
    if (args.milestone) createArgs.push('--milestone', args.milestone);
    const url = gh(createArgs);
    console.log(`+ created: ${title} -> ${url}`);
    created++;

    // Reflect completed tasks by closing the freshly created issue.
    if (t.status === 'x') {
      const num = url.split('/').pop();
      gh(['issue', 'close', num, '--repo', repo, '--reason', 'completed']);
      console.log(`  closed #${num} (task done)`);
    }
  }

  console.log(`\nDone. created=${created} skipped=${skipped} total=${tasks.length}`);
  if (!args.create) console.log('Dry run only. Re-run with --create to apply.');
}

main();
