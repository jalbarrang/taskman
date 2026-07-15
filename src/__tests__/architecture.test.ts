import { describe, expect, test } from 'bun:test';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function sources(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? sources(path) : entry.name.endsWith('.ts') ? [path] : [];
  }))).flat();
}

describe('application dependency direction', () => {
  test('keeps adapters and protocol dependencies above src/app', async () => {
    const files = await sources(join(import.meta.dir, '..', 'app'));
    const forbidden = /(?:from|import)\s*\(?\s*['"][^'"]*(?:\/cli(?:\/|\.js|['"])|\/mcp(?:\/|\.js|['"])|@modelcontextprotocol\/sdk|zod)[^'"]*['"]/;
    for (const file of files) expect(await readFile(file, 'utf8')).not.toMatch(forbidden);
  });
});
