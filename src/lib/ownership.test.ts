import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  canWrite,
  checkCommand,
  checkTool,
  globToRegExp,
  loadManifest,
  resolveRule,
  roleFromBranch,
  ROLES,
} from '../../scripts/agent-guard.mjs';
import { PURE_MODULES } from '../../scripts/sync-edge-shared.mjs';

/**
 * agents/ownership.json is the written form of "who may change what", and this is the test that
 * keeps it honest. It is NOT the security boundary (that is the GitHub ruleset and the deploy
 * approval gate, docs/agent-workflow/github-protections.md); it exists so the paperwork cannot drift
 * away from the repository it describes.
 */

const manifest = loadManifest();
const LANES = ROLES.filter((r) => r !== 'coordinator' && r !== 'ui');

function trackedFiles(): string[] | null {
  try {
    return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      .split('\0')
      .filter(Boolean);
  } catch {
    return null; // not a git checkout (an exported source tree): the file-coverage checks cannot run
  }
}

describe('glob matching', () => {
  it('treats * as one path segment and ** as any depth', () => {
    expect(globToRegExp('src/lib/scan-*').test('src/lib/scan-reward.ts')).toBe(true);
    expect(globToRegExp('src/lib/scan-*').test('src/lib/sub/scan-x.ts')).toBe(false);
    expect(globToRegExp('public/cards/**').test('public/cards/thumb/a.webp')).toBe(true);
    expect(globToRegExp('public/cards/**').test('public/cards')).toBe(false);
    expect(globToRegExp('**').test('anything/at/all.txt')).toBe(true);
  });

  it('escapes regex characters and handles spaces in a directory name', () => {
    const photos = loadManifest().rules.find((r) => r.owner === 'human');
    expect(photos).toBeDefined();
    expect(resolveRule('iCloud Photos from Lillie Jahr 4/IMG_0272.JPEG', manifest)?.owner).toBe('human');
    expect(globToRegExp('a.b').test('aXb')).toBe(false);
  });
});

describe('coverage', () => {
  const files = trackedFiles();

  it.skipIf(files === null)('names an owner for every source file, so a new one cannot land unowned', () => {
    const orphaned = (files ?? []).filter((f) => {
      if (!f.startsWith('src/')) return false;
      return resolveRule(f, manifest)?.catchAll === true;
    });
    // If this fails: a file was added under src/ whose name matches no lane. Either rename it to
    // follow a lane prefix, or add a rule in agents/ownership.json (a coordinator change).
    expect(orphaned).toEqual([]);
  });

  it('ends in exactly one catch-all, and it belongs to the coordinator', () => {
    const catchAlls = manifest.rules.filter((r) => r.catchAll);
    expect(catchAlls).toHaveLength(1);
    expect(catchAlls[0]?.owner).toBe('coordinator');
    expect(manifest.rules[manifest.rules.length - 1]).toBe(catchAlls[0]);
  });

  it('only uses owners that are roles, the human, or the shared space', () => {
    const allowed = new Set([...ROLES, 'human', 'any-agent']);
    for (const rule of manifest.rules) expect(allowed.has(rule.owner)).toBe(true);
  });
});

describe('what no agent may touch', () => {
  const tierZero = [
    'AGENTS.md',
    'public/cards/dandelion.webp',
    'public/cards/thumb/dandelion.webp',
    'public/product/box.png',
    'src/data/herbs.json',
    'src/data/sprites.json',
    'iCloud Photos from Lillie Jahr 4/IMG_0272.JPEG',
    'evidence/photos/pinus_strobus/1.jpg',
    'field/spec-001/spec-001_1-habit.jpg',
    'src/app/privacy/page.tsx',
    'src/components/SafetyNotice.tsx',
    'src/lib/card-cautions.ts',
  ];

  it.each(ROLES)('role %s cannot write any Tier 0 path', (role) => {
    for (const path of tierZero) expect(canWrite(role, path, manifest), `${role} -> ${path}`).toBe(false);
  });

  const designSurface = [
    'src/app/globals.css',
    'src/components/SiteNav.tsx',
    'src/components/ui/Button.tsx',
    'src/components/herbdex/HerbGrid.tsx',
  ];

  it.each(ROLES.filter((r) => r !== 'ui'))('role %s cannot write the design surface', (role) => {
    for (const path of designSurface) expect(canWrite(role, path, manifest), `${role} -> ${path}`).toBe(false);
  });

  it('keeps the design surface writable by the UI session', () => {
    for (const path of designSurface) expect(canWrite('ui', path, manifest)).toBe(true);
  });
});

describe('shared contracts have one owner', () => {
  const contracts = [
    'src/lib/types.ts',
    'src/lib/herbdex-reducer.ts',
    'src/lib/herbdex-state.ts',
    'src/lib/progression.ts',
    'src/lib/mastery.ts',
    'src/lib/research.ts',
    'src/lib/achievements.ts',
    'src/lib/storage.ts',
    'src/lib/remote-herbdex-storage.ts',
    'src/lib/deck.ts',
    'src/lib/catalogue.ts',
    'src/lib/supabase-client.ts',
    'src/lib/unlocked-field-cards.ts',
    'src/state/HerbdexProvider.tsx',
    'src/state/AuthProvider.tsx',
    'src/app/layout.tsx',
    'supabase/migrations/0014_anything.sql',
    'supabase/functions/herbdex-action/index.ts',
    'supabase/functions/_shared/herbdex/progression.ts',
    '.github/workflows/deploy.yml',
    '.github/CODEOWNERS',
    '.claude/settings.json',
    '.githooks/pre-commit',
    'package.json',
    'package-lock.json',
    'next.config.ts',
    'agents/ownership.json',
    'CLAUDE.md',
  ];

  it('gives every contract to the coordinator', () => {
    for (const path of contracts) {
      expect(resolveRule(path, manifest)?.owner, path).toBe('coordinator');
    }
  });

  it.each(LANES)('lane %s cannot write a contract', (role) => {
    for (const path of contracts) expect(canWrite(role, path, manifest), `${role} -> ${path}`).toBe(false);
  });

  it('keeps the card-awarding and XP path out of BOTH Scan and Discoveries', () => {
    // The owner's rule: Scan and Discoveries must never independently change what awards a card,
    // what XP is worth, or how mastery is reached. Each consumes discover(); neither edits it.
    const awarding = [
      'src/lib/herbdex-reducer.ts',
      'src/lib/progression.ts',
      'src/lib/mastery.ts',
      'src/lib/research.ts',
      'src/lib/achievements.ts',
      'src/state/HerbdexProvider.tsx',
      'src/state/herbdex-store.ts',
      'src/lib/remote-herbdex-storage.ts',
      'supabase/functions/herbdex-action/index.ts',
    ];
    for (const path of awarding) {
      expect(canWrite('scan', path, manifest), `scan -> ${path}`).toBe(false);
      expect(canWrite('discoveries', path, manifest), `discoveries -> ${path}`).toBe(false);
      expect(canWrite('quests', path, manifest), `quests -> ${path}`).toBe(false);
    }
  });

  it('never lets a lane write a migration, a workflow or a dependency', () => {
    for (const role of ROLES.filter((r) => r !== 'coordinator')) {
      for (const path of ['supabase/migrations/0099_x.sql', '.github/workflows/new.yml', 'package.json']) {
        expect(canWrite(role, path, manifest), `${role} -> ${path}`).toBe(false);
      }
    }
  });
});

describe('modules mirrored into the edge functions', () => {
  // A module in PURE_MODULES is copied into supabase/functions/_shared by `npm run sync:edge-shared`
  // and runs server-side. Changing one changes deployed behaviour, so each must have a deliberate
  // owner: the coordinator, or a lane that has declared it in `mirrored` and therefore ships the
  // regenerated copy with the change (src/lib/edge-shared.test.ts fails on drift).
  const declared = new Map<string, string>();
  for (const rule of manifest.rules) for (const name of rule.mirrored ?? []) declared.set(name, rule.owner);

  it.each(PURE_MODULES)('%s has a deliberate owner on both sides', (name: string) => {
    const lib = resolveRule(`src/lib/${name}`, manifest);
    const copy = resolveRule(`supabase/functions/_shared/herbdex/${name}`, manifest);
    expect(lib?.catchAll).not.toBe(true);
    if (declared.has(name)) {
      expect(lib?.owner).toBe(declared.get(name));
      expect(copy?.owner, `${name}: the regenerated copy must be writable by the same lane`).toBe(declared.get(name));
    } else {
      expect(['coordinator', 'human']).toContain(lib?.owner);
    }
  });

  it('declares no mirrored module that is not mirrored', () => {
    for (const name of declared.keys()) expect(PURE_MODULES).toContain(name);
  });
});

describe('branch names', () => {
  it('maps each lane prefix to its role', () => {
    expect(roleFromBranch('agent/scan/better-ranking', manifest)).toBe('scan');
    expect(roleFromBranch('agent/quests/weekly', manifest)).toBe('quests');
    expect(roleFromBranch('agent/discoveries/journal-fix', manifest)).toBe('discoveries');
    expect(roleFromBranch('coord/wave0', manifest)).toBe('coordinator');
    expect(roleFromBranch('ui/nav', manifest)).toBe('ui');
    expect(roleFromBranch('proto/b/avatars', manifest)).toBe('lane-b');
  });

  it('treats the integration branch as a promotion and everything else as unknown', () => {
    expect(roleFromBranch('integration', manifest)).toBe('integration');
    expect(roleFromBranch('feature/whatever', manifest)).toBeNull();
    expect(roleFromBranch('claude/planning-session-61zwro', manifest)).toBeNull();
  });
});

describe('the production branch', () => {
  it('is the branch deploy.yml deploys, so a rename cannot leave the guard protecting the wrong one', () => {
    const deploy = readFileSync('.github/workflows/deploy.yml', 'utf8');
    const match = /push:\s*\n\s*branches:\s*\[([^\]]+)\]/.exec(deploy);
    expect(match, 'deploy.yml no longer has a push: branches: [..] trigger this test understands').not.toBeNull();
    const deployed = (match?.[1] ?? '').split(',').map((b) => b.trim());
    expect(deployed).toEqual([manifest.production]);
    expect(manifest.protectedBranches).toContain(manifest.production);
    expect(manifest.protectedBranches).toContain('integration');
  });

  it('is never the head of a lane: no lane prefix can name it', () => {
    for (const prefix of Object.keys(manifest.branches)) expect(manifest.production.startsWith(prefix)).toBe(false);
  });
});

describe('GitHub tools an agent session may not use', () => {
  it.each(['scan', 'quests', 'discoveries', 'ui', 'lane-b', 'coordinator'])('%s cannot dispatch workflows or write files through the API', (role) => {
    expect(checkTool(role, 'mcp__github__actions_run_trigger')).not.toBeNull();
    expect(checkTool(role, 'mcp__github__push_files')).not.toBeNull();
    expect(checkTool(role, 'mcp__github__create_or_update_file')).not.toBeNull();
  });

  it('lets only the coordinator merge', () => {
    expect(checkTool('coordinator', 'mcp__github__merge_pull_request')).toBeNull();
    for (const role of ['scan', 'quests', 'discoveries', 'ui', 'lane-b']) {
      expect(checkTool(role, 'mcp__github__merge_pull_request')).not.toBeNull();
    }
  });

  it('leaves reading and PR creation alone', () => {
    for (const tool of ['mcp__github__create_pull_request', 'mcp__github__pull_request_read', 'mcp__github__list_branches', 'Edit']) {
      expect(checkTool('scan', tool)).toBeNull();
    }
  });
});

describe('forbidden commands', () => {
  it.each([
    'gh workflow run deploy-function.yml',
    'gh api repos/x/y/rulesets -X POST',
    'git push origin claude/planning-session-61zwro',
    'git push --force origin agent/scan/x',
    'git push origin HEAD:integration',
    'npm run verify:supabase',
    'supabase functions deploy identify-plant',
    'npm run build:deck -- --source x',
    'gh secret set FOO',
  ])('blocks %s', (command) => {
    expect(checkCommand(command)).not.toBeNull();
  });

  it('ignores prose that only mentions a forbidden command', () => {
    expect(checkCommand('git commit -m "Explain why git push origin integration is refused"')).toBeNull();
    expect(checkCommand("python3 - <<'EOF'\nprint('git push origin integration')\nEOF\ngit status")).toBeNull();
    expect(checkCommand('git commit -F - <<EOF\nthe gh workflow run command stays blocked\nEOF')).toBeNull();
  });

  it('still catches a real command that is quoted, chained or after prose', () => {
    expect(checkCommand('git push origin "integration"')).not.toBeNull();
    expect(checkCommand('git commit -m "ok then" && git push origin integration')).not.toBeNull();
    expect(checkCommand("echo 'a b' ; gh workflow run deploy-function.yml")).not.toBeNull();
  });

  it.each(['npm run verify', 'git push origin agent/scan/better-ranking', 'git status', 'npx vitest run src/lib/ownership.test.ts'])(
    'allows %s',
    (command) => {
      expect(checkCommand(command)).toBeNull();
    },
  );
});
