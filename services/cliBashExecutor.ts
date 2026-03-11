/**
 * CLI Bash Executor
 *
 * Executes real commands through bash and uses grep/rg-style filtering
 * to extract key lines for agent-side consumption and debugging.
 */

export interface CliBashResult {
    ok: boolean;
    raw: string;
    filtered: string;
    error?: string;
    exitCode?: number;
}

export interface CliCurlRequest {
    url: string;
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: Record<string, any> | null;
    grepPattern: string;
    maxFilteredLines?: number;
    timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 20_000;
const RESULT_SEPARATOR = '__LUMI_FILTERED__';

function shellEscapeSingle(value: string): string {
    return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function resolveCliMode(): 'cli' | 'tool' {
    const env = (typeof process !== 'undefined' && process?.env)
        ? process.env
        : undefined;
    const raw = String(
        env?.LUMI_EXECUTOR_MODE
        || env?.SUPER_AGENT_EXECUTION_MODE
        || env?.VITE_LUMI_EXECUTOR_MODE
        || 'cli'
    ).trim().toLowerCase();
    return raw === 'tool' || raw === 'tool_only' ? 'tool' : 'cli';
}

function canUseNodeRuntime(): boolean {
    return typeof window === 'undefined' && typeof process !== 'undefined';
}

export function isCliBashExecutionEnabled(): boolean {
    if (!canUseNodeRuntime()) return false;
    const env = process.env || {};
    const isTestEnv = Boolean(env.VITEST) || env.NODE_ENV === 'test';
    if (isTestEnv && String(env.LUMI_EXECUTOR_MODE || '').trim().toLowerCase() !== 'cli_force') {
        return false;
    }
    return resolveCliMode() === 'cli';
}

async function runBash(script: string, timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
    const childProcess = await import('child_process');
    const util = await import('util');
    const execFileAsync = util.promisify(childProcess.execFile);
    return execFileAsync('bash', ['-lc', script], {
        timeout: timeoutMs,
        maxBuffer: 8 * 1024 * 1024,
        env: process.env,
    });
}

export async function runCurlJsonWithGrep(request: CliCurlRequest): Promise<CliBashResult> {
    if (!isCliBashExecutionEnabled()) {
        return {
            ok: false,
            raw: '',
            filtered: '',
            error: 'cli_bash_disabled_or_unavailable',
        };
    }

    const method = (request.method || 'POST').toUpperCase();
    const timeoutMs = Math.max(1000, request.timeoutMs || DEFAULT_TIMEOUT_MS);
    const maxLines = Math.max(20, request.maxFilteredLines || 120);
    const headers = request.headers || {};
    const bodyText = request.body ? JSON.stringify(request.body) : '';

    const curlParts: string[] = [
        `curl -sS -L --max-time ${Math.max(1, Math.floor(timeoutMs / 1000))}`,
        `-X ${method}`,
    ];

    for (const [key, value] of Object.entries(headers)) {
        curlParts.push(`-H ${shellEscapeSingle(`${key}: ${value}`)}`);
    }
    if (bodyText && method !== 'GET') {
        curlParts.push(`--data ${shellEscapeSingle(bodyText)}`);
    }
    curlParts.push(shellEscapeSingle(request.url));

    const command = curlParts.join(' ');
    const script = [
        'set -euo pipefail',
        `RAW=$(${command})`,
        `FILTERED=$(printf '%s' "$RAW" | grep -E ${shellEscapeSingle(request.grepPattern)} | head -n ${maxLines} || true)`,
        `printf '%s\n${RESULT_SEPARATOR}\n%s' "$RAW" "$FILTERED"`,
    ].join('\n');

    try {
        const { stdout } = await runBash(script, timeoutMs);
        const [raw, filtered = ''] = stdout.split(`\n${RESULT_SEPARATOR}\n`);
        return {
            ok: true,
            raw: raw || '',
            filtered: filtered || '',
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const stderr = typeof error === 'object' && error && 'stderr' in error
            ? String((error as any).stderr || '')
            : '';
        return {
            ok: false,
            raw: '',
            filtered: '',
            error: stderr ? `${message}: ${stderr}` : message,
        };
    }
}
