#!/usr/bin/env node
/**
 * Agent path guard: answers "may this role change this file?" from agents/ownership.json.
 *
 * THIS IS A SECOND LINE OF DEFENCE, NOT THE FIRST. A hook runs on the machine of whoever is being
 * guarded and can be skipped, and a manifest only says what was intended. The boundary that cannot
 * be skipped is on GitHub: a ruleset on the production and integration branches, required status
 * checks, and an approval gate on the deploy environment (docs/agent-workflow/github-protections.md).
 * This script exists so that (a) a mistake is caught at the moment it is made rather than at review,
 * and (b) the PR gate can check a diff against the same rules the hook used.
 *
 * Modes
 *   hook                       Claude Code PreToolUse hook. Reads the tool call as JSON on stdin and
 *                              the role from AGENT_ROLE. No role set = a human session = allow all.
 *   diff [--role R] [--base B] [--manifest M]
 *                              Check every file changed between B (default origin/integration) and
 *                              HEAD. Role comes from --role, else from the branch name. CI passes M as the
 *                              base branch's copy of agents/ownership.json.
 *   who <path>                 Print which rule owns a path.
 *
 * Exit codes: 0 allowed, 1 violation (diff/who), 2 blocked (hook, the code Claude Code treats as a
 * refusal and shows to the model).
 *
 * No dependencies on purpose: this must run in CI before `npm ci` and inside a bare worktree.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_MANIFEST = join(HERE, '..', 'agents', 'ownership.json');

/** Roles that exist. `integration` is the promotion branch: checked at merge time, not per path. */
export const ROLES = ['coordinator', 'scan', 'quests', 'discoveries', 'ui', 'lane-b'];

export function loadManifest(path = DEFAULT_MANIFEST) {
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  return { ...manifest, rules: manifest.rules.map((r) => ({ ...r, matchers: r.globs.map(globToRegExp) })) };
}

/**
 * `**` crosses directories, `*` and `?` do not. A trailing slash-star-star matches the directory's
 * contents and not the directory name itself. Case-sensitive, like git. No brace expansion: list each.
 */
export function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i += 1;
        if (glob[i + 1] === '/') {
          i += 1;
          out += '(?:.*/)?';
        } else {
          out += '.*';
        }
      } else {
        out += '[^/]*';
      }
    } else if (c === '?') {
      out += '[^/]';
    } else {
      out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${out}$`);
}

/** The first rule that matches wins. Paths are repo-relative with forward slashes. */
export function resolveRule(path, manifest) {
  const clean = path.split(sep).join('/').replace(/^\.\//, '');
  for (const rule of manifest.rules) {
    if (rule.matchers.some((m) => m.test(clean))) return rule;
  }
  return null;
}

export function canWrite(role, path, manifest) {
  const rule = resolveRule(path, manifest);
  if (!rule) return false;
  if (rule.owner === role) return true;
  if (rule.owner === 'any-agent') return ROLES.includes(role);
  return false;
}

export function roleFromBranch(branch, manifest) {
  if (!branch) return null;
  if (branch === 'integration') return 'integration';
  for (const [prefix, role] of Object.entries(manifest.branches)) {
    if (branch.startsWith(prefix)) return role;
  }
  return null;
}

/** Commands an agent session should never run. Advisory: a shell has too many spellings to close. */
const FORBIDDEN_COMMANDS = [
  [/\bgh\s+workflow\s+run\b/, 'dispatching a workflow (several use production credentials)'],
  [/\bgh\s+api\b[^|;&]*(-X|--method)\s*(PUT|POST|PATCH|DELETE)/i, 'a mutating GitHub API call'],
  [/\bgh\s+(secret|variable|ruleset|repo\s+edit)\b/, 'changing repository secrets, variables, rulesets or settings'],
  [/\bgit\s+push\b[^|;&]*\s(--force|-f|--force-with-lease)\b/, 'a force push'],
  [/\bgit\s+push\b[^|;&]*(claude\/planning-session-61zwro|\bintegration\b|\bmain\b|\bmaster\b)/, 'pushing to a protected branch'],
  [/\bgit\s+(filter-branch|filter-repo)\b|\bgit\s+reflog\s+expire\b/, 'rewriting history'],
  [/\bnpm\s+run\s+verify:supabase\b/, 'the live Supabase suite (writes permanent rows)'],
  [/\bsupabase\s+(db\s+push|functions\s+deploy|secrets|link|login)\b/, 'a Supabase deploy or credential command'],
  [/\bnpm\s+run\s+(build:deck|build:sprites|build:chips|build:product)\b/, 'a generated-asset build (owner-run only)'],
];

/**
 * What the shell would actually run, with prose removed. A commit message or a heredoc that merely MENTIONS
 * "git push ... integration" is not a push, and flagging it makes the guard something agents learn to route
 * around. Heredoc bodies and quoted strings containing whitespace are dropped; a branch name never contains
 * whitespace, so a real `git push origin "integration"` keeps its quoted word and is still caught.
 */
export function stripProse(command) {
  return command
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\s|$)/g, ' ')
    .replace(/'[^']*\s[^']*'/g, "''")
    .replace(/"[^"]*\s[^"]*"/g, '""');
}

export function checkCommand(command) {
  const code = stripProse(command);
  for (const [pattern, what] of FORBIDDEN_COMMANDS) {
    if (pattern.test(code)) return what;
  }
  return null;
}

/**
 * GitHub MCP tools that change the repository from outside the worktree. They take a branch and an
 * arbitrary path, so they would walk straight past the path hook and the worktree, which is why an
 * agent session does not get them. Everything an agent needs goes through `git` in its own worktree
 * and a pull request.
 */
const GITHUB_TOOLS_NO_ROLE_MAY_USE = new Set([
  'mcp__github__actions_run_trigger',
  'mcp__github__create_repository',
  'mcp__github__fork_repository',
  'mcp__github__push_files',
  'mcp__github__create_or_update_file',
  'mcp__github__delete_file',
  'mcp__github__update_pull_request_branch',
  'mcp__github__disable_pr_auto_merge',
  'mcp__github__enable_pr_auto_merge',
]);
/** Only the coordinator merges, and only into `integration`; the ruleset enforces the second half. */
const GITHUB_TOOLS_COORDINATOR_ONLY = new Set(['mcp__github__merge_pull_request']);

export function checkTool(role, tool) {
  if (!tool.startsWith('mcp__github__')) return null;
  if (GITHUB_TOOLS_NO_ROLE_MAY_USE.has(tool)) return `${tool} (changes the repository outside a worktree)`;
  if (GITHUB_TOOLS_COORDINATOR_ONLY.has(tool) && role !== 'coordinator') return `${tool} (only the coordinator merges)`;
  return null;
}

function currentBranch(cwd) {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function repoRoot(cwd) {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' }).trim();
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function runHook(manifest) {
  // The role is AGENT_ROLE where a session can set it (a local worktree), and otherwise the lane the
  // checked-out branch name declares (a cloud session cannot set per-session environment variables).
  // A session on neither is a human's, and nothing is enforced here.
  let call;
  try {
    call = JSON.parse(readStdin() || '{}');
  } catch {
    call = null;
  }
  const cwd = call?.cwd ?? process.cwd();
  const branch = currentBranch(cwd);
  let role = process.env.AGENT_ROLE || null;
  if (!role) {
    const fromBranch = roleFromBranch(branch, manifest);
    role = fromBranch && ROLES.includes(fromBranch) ? fromBranch : null;
  }
  if (!role) return 0;
  if (!ROLES.includes(role)) {
    process.stderr.write(`agent-guard: AGENT_ROLE='${role}' is not a known role (${ROLES.join(', ')}). Refusing.\n`);
    return 2;
  }
  if (!call) {
    process.stderr.write('agent-guard: could not read the tool call. Refusing rather than guessing.\n');
    return 2;
  }
  const tool = call.tool_name ?? '';
  const input = call.tool_input ?? {};

  const blockedTool = checkTool(role, tool);
  if (blockedTool) {
    process.stderr.write(`agent-guard: role '${role}' may not use ${blockedTool}. Use git in your worktree and open a pull request.\n`);
    return 2;
  }
  if (manifest.protectedBranches?.includes(branch) && (tool === 'Edit' || tool === 'Write' || tool === 'NotebookEdit')) {
    process.stderr.write(`agent-guard: '${branch}' is a protected branch. Create a branch with your lane prefix and work there.\n`);
    return 2;
  }

  if (tool === 'Bash') {
    const hit = checkCommand(String(input.command ?? ''));
    if (hit) {
      process.stderr.write(`agent-guard: blocked ${hit}. Ask the coordinator via a Shared Change Request.\n`);
      return 2;
    }
    return 0;
  }

  const target = input.file_path ?? input.notebook_path;
  if (!target) return 0; // not a file write
  const root = repoRoot(cwd);
  const abs = isAbsolute(target) ? target : resolve(cwd, target);
  const rel = relative(root, abs);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    process.stderr.write(`agent-guard: ${target} is outside this worktree (${root}). An agent writes only inside its own worktree.\n`);
    return 2;
  }
  if (!canWrite(role, rel, manifest)) {
    const rule = resolveRule(rel, manifest);
    process.stderr.write(
      `agent-guard: role '${role}' may not edit ${rel} (owner: ${rule?.owner ?? 'nobody'}, tier ${rule?.tier ?? '?'}). ` +
        `Do not work around this. File a Shared Change Request in agents/requests/ and continue with the rest of the task.\n`,
    );
    return 2;
  }
  return 0;
}

function changedFiles(base, cwd) {
  return changedWithStatus(base, cwd).map((c) => c.path);
}

/** [{ status: 'A' | 'M' | 'D' | ..., path }]. Renames are reported as a delete plus an add, never as one move. */
function changedWithStatus(base, cwd) {
  const out = execFileSync('git', ['diff', '--name-status', '--no-renames', '-z', `${base}...HEAD`], { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const parts = out.split('\0').filter(Boolean);
  const changes = [];
  for (let i = 0; i + 1 < parts.length; i += 2) changes.push({ status: parts[i].charAt(0), path: parts[i + 1] });
  return changes;
}

export function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * ONE-TIME MAINTENANCE AUTHORIZATION (docs/agent-workflow/maintenance-authorization.md).
 *
 * Excuses an exact set of DELETIONS under protected areas, and nothing else. It is armed only when ALL of these hold:
 *   - an authorization file exists in the BASE branch's agents/maintenance/ (already reviewed and merged);
 *   - the repository variable MAINTENANCE_AUTH, which only the owner can set, equals that file's SHA-256;
 *   - the pull request's head branch is the one the file names, and the file has not expired;
 * and then only for a path that the PR DELETES, whose SHA-256 is listed, and whose content in the base branch has the
 * listed git blob id. An added or modified file, a different file, or a listed path with changed content is not excused.
 * Every other check (the lane rules for every other file, the tests, the build) is untouched.
 *
 * Pure: `authorizations` is [{ hash, data }], `changes` is [{ status, path }], `blobOf(path)` reads the base branch.
 */
export function maintenanceExcuses({ changes, authorizations, activeHash, branch, today, blobOf }) {
  const none = { excused: new Set(), id: null, reason: 'no authorization is armed' };
  const wanted = String(activeHash ?? '').trim().toLowerCase();
  if (!wanted) return none;
  const auth = authorizations.find((a) => a.hash === wanted);
  if (!auth) return { ...none, reason: 'MAINTENANCE_AUTH matches no authorization file in the base branch' };
  const d = auth.data;
  if (d.branch !== branch) return { ...none, reason: `authorization ${d.id} is for branch '${d.branch}', not '${branch}'` };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.expires ?? '') || today > d.expires) return { ...none, reason: `authorization ${d.id} expired` };
  const listed = new Map((d.deletions ?? []).map((e) => [e.pathSha256, e.blob]));
  const excused = new Set();
  for (const c of changes) {
    if (c.status !== 'D') continue;
    const blob = listed.get(sha256(c.path));
    if (blob && blob === blobOf(c.path)) excused.add(c.path);
  }
  return { excused, id: d.id, reason: 'armed' };
}

function loadAuthorizations(dir) {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const raw = readFileSync(join(dir, f));
        return { hash: sha256(raw), data: JSON.parse(raw.toString('utf8')) };
      });
  } catch {
    return [];
  }
}

function runDiff(manifest, args) {
  const flag = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const base = flag('--base') ?? 'origin/integration';
  let role = flag('--role');
  if (!role) {
    const branch = process.env.GITHUB_HEAD_REF || execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim();
    role = roleFromBranch(branch, manifest);
    if (!role) {
      process.stderr.write(`agent-guard: branch '${branch}' matches no lane prefix (${Object.keys(manifest.branches).join(' ')}). Rename it, or pass --role.\n`);
      return 1;
    }
  }
  if (role === 'integration') return 0; // a promotion PR carries already-checked commits
  if (!ROLES.includes(role)) {
    process.stderr.write(`agent-guard: unknown role '${role}'\n`);
    return 1;
  }
  const changes = changedWithStatus(base, process.cwd());
  let bad = changes.map((c) => c.path).filter((f) => !canWrite(role, f, manifest));
  if (bad.length > 0) {
    const branch = process.env.GITHUB_HEAD_REF || execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim();
    const verdict = maintenanceExcuses({
      changes: changes.filter((c) => bad.includes(c.path)),
      authorizations: loadAuthorizations(join(HERE, '..', 'agents', 'maintenance')),
      activeHash: process.env.MAINTENANCE_AUTH,
      branch,
      today: new Date().toISOString().slice(0, 10),
      blobOf: (path) => {
        try {
          return execFileSync('git', ['rev-parse', `${base}:${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        } catch {
          return '';
        }
      },
    });
    if (verdict.excused.size > 0) {
      process.stdout.write(`agent-guard: maintenance authorization '${verdict.id}' excuses ${verdict.excused.size} listed deletion(s); all other rules still apply.\n`);
      bad = bad.filter((f) => !verdict.excused.has(f));
    } else if (process.env.MAINTENANCE_AUTH) {
      process.stderr.write(`agent-guard: MAINTENANCE_AUTH is set but excuses nothing (${verdict.reason}).\n`);
    }
  }
  if (bad.length === 0) {
    process.stdout.write(`agent-guard: role '${role}' changed only files it may change.\n`);
    return 0;
  }
  process.stderr.write(`agent-guard: role '${role}' changed ${bad.length} file(s) it does not own:\n`);
  for (const f of bad) {
    const rule = resolveRule(f, manifest);
    process.stderr.write(`  ${f}   (owner: ${rule?.owner}, tier ${rule?.tier})\n`);
  }
  process.stderr.write('Move those changes into a Shared Change Request (agents/requests/), then drop them from this branch.\n');
  return 1;
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const [mode, ...rest] = process.argv.slice(2);
  // CI passes the BASE branch's copy of the manifest, so a pull request cannot loosen the rules it is judged by.
  const manifestFlag = rest.indexOf('--manifest');
  const manifest = loadManifest(manifestFlag >= 0 ? rest[manifestFlag + 1] : undefined);
  if (mode === 'hook') process.exit(runHook(manifest));
  else if (mode === 'diff') process.exit(runDiff(manifest, rest));
  else if (mode === 'who') {
    const rule = resolveRule(rest[0] ?? '', manifest);
    process.stdout.write(rule ? `${rule.owner} (tier ${rule.tier})\n${rule.why}\n` : 'no rule\n');
  } else {
    process.stderr.write('usage: agent-guard.mjs hook | diff [--role R] [--base B] | who <path>\n');
    process.exit(1);
  }
}
