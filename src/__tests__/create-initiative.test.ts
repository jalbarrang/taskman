import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { chdir } from 'node:process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import { createInitiativeCommand } from '../cli/commands/create-initiative.js';
import { CliError } from '../cli/runtime.js';

let cwd: string;
let tmp: string;

async function capture(fn: () => Promise<void>): Promise<string> {
  const original = process.stdout.write.bind(process.stdout);
  let out = '';
  process.stdout.write = ((chunk: string) => {
    out += chunk;
    return true;
  }) as typeof process.stdout.write;
  try {
    await fn();
  } finally {
    process.stdout.write = original;
  }
  return out;
}

beforeEach(async () => {
  cwd = process.cwd();
  tmp = await mkdtemp(join(tmpdir(), 'taskman-init-'));
  chdir(tmp);
});
afterEach(async () => {
  chdir(cwd);
  await rm(tmp, { recursive: true, force: true });
});

describe('create-initiative', () => {
  test('writes INITIATIVE.md and a registry entry', async () => {
    const out = await capture(() =>
      createInitiativeCommand({
        name: 'auth-overhaul',
        title: 'Auth Overhaul',
        overview: '# Goal\nShip auth.',
        json: true,
      }),
    );
    expect(JSON.parse(out)).toMatchObject({
      name: 'auth-overhaul',
      initiative_dir: '.plans/auth-overhaul',
    });
    expect(await readFile('.plans/auth-overhaul/INITIATIVE.md', 'utf8')).toContain('Ship auth.');
    const entry = JSON.parse((await readFile('.plans/initiatives.jsonl', 'utf8')).trim());
    expect(entry).toMatchObject({
      _type: 'initiative',
      name: 'auth-overhaul',
      status: 'in-progress',
      title: 'Auth Overhaul',
      completed_at: null,
    });
    expect(typeof entry.created_at).toBe('string');
  });

  test('rejects duplicate and non-kebab names', async () => {
    await createInitiativeCommand({ name: 'dup', title: 'Dup', overview: 'x' });
    await expect(
      createInitiativeCommand({ name: 'dup', title: 'Dup 2', overview: 'y' }),
    ).rejects.toBeInstanceOf(CliError);
    await expect(
      createInitiativeCommand({ name: 'Not Kebab', title: 'X', overview: 'y' }),
    ).rejects.toBeInstanceOf(CliError);
  });

  test('json output includes name and title', async () => {
    const out = await capture(() =>
      createInitiativeCommand({ name: 'json-init', title: 'JSON Init', overview: 'o', json: true }),
    );
    expect(JSON.parse(out)).toMatchObject({
      name: 'json-init',
      title: 'JSON Init',
      initiative_dir: '.plans/json-init',
    });
  });

  test('reads overview from --overview-file - (stdin)', async () => {
    const original = process.stdin;
    const mock = Readable.from([Buffer.from('# From stdin\n')]);
    Object.defineProperty(mock, 'isTTY', { value: false });
    Object.defineProperty(process, 'stdin', { value: mock, configurable: true });
    try {
      await createInitiativeCommand({ name: 'from-stdin', title: 'From Stdin', overviewFile: '-' });
    } finally {
      Object.defineProperty(process, 'stdin', { value: original, configurable: true });
    }
    expect(await readFile('.plans/from-stdin/INITIATIVE.md', 'utf8')).toContain('From stdin');
  });
});
