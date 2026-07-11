import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DEFAULT_PLANS_ROOT, TASKMANRC_FILENAME, resolveLedgerRoot } from '../config.js';
import { makePlanRuntime } from '../effects/runtime.js';
import { writePlansManifest } from '../storage/plans-manifest.js';

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'taskman-config-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

async function writeRc(contents: string): Promise<void> {
  await writeFile(join(tmp, TASKMANRC_FILENAME), contents, 'utf-8');
}

describe('resolveLedgerRoot', () => {
  test('defaults to .taskman/plans when no rc file exists', () => {
    expect(resolveLedgerRoot(tmp)).toEqual({ root: DEFAULT_PLANS_ROOT, source: 'default' });
  });

  test('reads plans-root from .taskmanrc', async () => {
    await writeRc('{"plans-root":"custom/ledger"}');
    expect(resolveLedgerRoot(tmp)).toEqual({ root: 'custom/ledger', source: 'taskmanrc' });
  });

  test('an absolute plans-root passes through untouched', async () => {
    const abs = join(tmp, 'abs-ledger');
    await writeRc(JSON.stringify({ 'plans-root': abs }));
    expect(resolveLedgerRoot(tmp)).toEqual({ root: abs, source: 'taskmanrc' });
  });

  test('trailing slashes are trimmed', async () => {
    await writeRc('{"plans-root":"custom/ledger///"}');
    expect(resolveLedgerRoot(tmp).root).toBe('custom/ledger');
  });

  test('an rc without plans-root falls back to the default', async () => {
    await writeRc('{"other":"setting"}');
    expect(resolveLedgerRoot(tmp)).toEqual({ root: DEFAULT_PLANS_ROOT, source: 'default' });
  });

  test('malformed JSON throws a clear error', async () => {
    await writeRc('not json');
    expect(() => resolveLedgerRoot(tmp)).toThrow(/\.taskmanrc is not valid JSON/);
  });

  test('a non-string plans-root throws', async () => {
    await writeRc('{"plans-root":42}');
    expect(() => resolveLedgerRoot(tmp)).toThrow(/"plans-root" must be a non-empty string/);
  });

  test('an empty plans-root throws', async () => {
    await writeRc('{"plans-root":"  "}');
    expect(() => resolveLedgerRoot(tmp)).toThrow(/"plans-root" must be a non-empty string/);
  });

  test('a non-object rc throws', async () => {
    await writeRc('["plans-root"]');
    expect(() => resolveLedgerRoot(tmp)).toThrow(/must be a JSON object/);
  });
});

describe('rc-driven ledger root end to end', () => {
  test('a storage program lands in the configured root, not the default', async () => {
    await writeRc('{"plans-root":"custom/ledger"}');
    const { root } = resolveLedgerRoot(tmp);
    const run = makePlanRuntime(join(tmp, root));

    await run(
      writePlansManifest([
        {
          _type: 'plan',
          name: 'rc-plan',
          status: 'in-progress',
          title: 'Rc plan',
          created_at: 'now',
          completed_at: null,
        },
      ]),
    );

    const written = await readFile(join(tmp, 'custom/ledger/plans.jsonl'), 'utf-8');
    expect(written).toContain('rc-plan');
    await expect(access(join(tmp, '.taskman'))).rejects.toThrow();
  });
});
