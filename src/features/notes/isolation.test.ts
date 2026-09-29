/**
 * REGRA OBRIGATÓRIA: notas privadas nunca podem ser enviadas ao servidor.
 * Este teste falha se qualquer arquivo do módulo de notas passar a depender
 * (direta ou indiretamente) do cliente Supabase ou da camada de sincronização.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const SRC = resolve(__dirname, '..', '..');
const NOTES_DIR = __dirname;
const FORBIDDEN = [/@supabase\//, /core\/supabase/, /features\/sync/, /features\/couple/, /features\/events/];

function filesIn(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesIn(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

function importsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  return [
    ...source.matchAll(/(?:import|export)[^'"]*from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g),
  ].map((m) => (m[1] ?? m[2]) as string);
}

function resolveImport(from: string, specifier: string): string | null {
  const base = specifier.startsWith('@/')
    ? join(SRC, specifier.slice(2))
    : specifier.startsWith('.')
      ? resolve(dirname(from), specifier)
      : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // tenta o próximo
    }
  }
  return null;
}

describe('isolamento das notas privadas', () => {
  it('nenhum arquivo de notas depende do servidor (nem indiretamente)', () => {
    const offenders: string[] = [];
    const visited = new Set<string>();
    const queue = filesIn(NOTES_DIR).filter((f) => !f.endsWith('.test.ts'));

    while (queue.length) {
      const file = queue.pop() as string;
      if (visited.has(file)) continue;
      visited.add(file);
      for (const specifier of importsOf(file)) {
        if (FORBIDDEN.some((re) => re.test(specifier))) offenders.push(`${file} → ${specifier}`);
        const resolved = resolveImport(file, specifier);
        if (resolved && !resolved.includes('node_modules')) queue.push(resolved);
      }
    }

    expect(offenders).toEqual([]);
    expect(visited.size).toBeGreaterThanOrEqual(3);
  });
});
