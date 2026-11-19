export const ROLES: string[];

export interface OwnershipRule {
  owner: string;
  tier: number;
  why: string;
  globs: string[];
  catchAll?: boolean;
  mirrored?: string[];
  matchers: RegExp[];
}

export interface OwnershipManifest {
  version: number;
  production: string;
  protectedBranches: string[];
  branches: Record<string, string>;
  rules: OwnershipRule[];
}

export function loadManifest(path?: string): OwnershipManifest;
export function globToRegExp(glob: string): RegExp;
export function resolveRule(path: string, manifest: OwnershipManifest): OwnershipRule | null;
export function canWrite(role: string, path: string, manifest: OwnershipManifest): boolean;
export function roleFromBranch(branch: string | null | undefined, manifest: OwnershipManifest): string | null;
export function stripProse(command: string): string;
export function checkCommand(command: string): string | null;
export function checkTool(role: string, tool: string): string | null;
