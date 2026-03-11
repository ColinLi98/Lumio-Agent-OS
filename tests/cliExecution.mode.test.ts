import { describe, expect, it } from 'vitest';
import { isCliBashExecutionEnabled } from '../services/cliBashExecutor.js';
import { executeToolViaCli } from '../services/cliToolExecutor.js';

function withEnv<T>(patch: Record<string, string | undefined>, run: () => T): T {
    const backup: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(patch)) {
        backup[key] = process.env[key];
        if (typeof value === 'undefined') {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
    try {
        return run();
    } finally {
        for (const [key, value] of Object.entries(backup)) {
            if (typeof value === 'undefined') {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    }
}

describe('CLI execution mode guard', () => {
    it('disables CLI in test env by default', () => {
        const enabled = withEnv(
            {
                VITEST: '1',
                LUMI_EXECUTOR_MODE: undefined,
            },
            () => isCliBashExecutionEnabled()
        );
        expect(enabled).toBe(false);
    });

    it('allows explicit cli_force in test env', () => {
        const enabled = withEnv(
            {
                VITEST: '1',
                LUMI_EXECUTOR_MODE: 'cli_force',
            },
            () => isCliBashExecutionEnabled()
        );
        expect(enabled).toBe(true);
    });

    it('returns unsupported when executor mode is tool_only', async () => {
        const result = await withEnv(
            {
                VITEST: '1',
                LUMI_EXECUTOR_MODE: 'tool_only',
            },
            () => executeToolViaCli('live_search', { query: 'test' })
        );
        expect(result.supported).toBe(false);
        expect(result.success).toBe(false);
    });
});

