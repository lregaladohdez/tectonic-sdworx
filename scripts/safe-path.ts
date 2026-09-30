/**
 * Path helpers for the dev-only scripts. Every file these scripts read, copy or
 * write is a fixed name inside a fixed directory of this checkout; these helpers
 * make that provable: the name is reduced to its base name, resolved against the
 * base directory, and anything that lands outside it is refused.
 */
import path from "node:path";

/** `base/name` for a bare file name; throws for separators, `..`, or anything outside `base`. */
export function fileUnder(base: string, name: string): string {
  const root = path.resolve(base);
  const bare = path.basename(name);
  if (bare !== name || bare === "" || bare === "." || bare === "..") {
    throw new Error(`Refusing file name "${name}": expected a bare file name`);
  }
  const file = path.resolve(root, bare);
  if (!file.startsWith(root + path.sep)) throw new Error(`Refusing path outside ${root}: ${file}`);
  return file;
}

/** True when `candidate` (any path) resolves to a file directly inside `base`. */
export function isDirectlyUnder(base: string, candidate: string): boolean {
  const root = path.resolve(base);
  const file = path.resolve(candidate);
  return path.dirname(file) === root;
}
