#!/usr/bin/env node

import { spawn } from 'node:child_process';

const DEFAULT_BASE_URL = 'https://lumi-agent-simulator.vercel.app';
const baseUrl = process.env.LUMI_BASE_URL || DEFAULT_BASE_URL;

const markerIndex = process.argv.indexOf('--');
const commandArgs = markerIndex >= 0 ? process.argv.slice(markerIndex + 1) : [];
const command = commandArgs.join(' ').trim();

if (!command) {
  console.error('[with-dev-server] Missing command. Usage: node scripts/with-dev-server.mjs -- <command>');
  process.exit(1);
}

function parseBaseUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (error) {
    throw new Error(`Invalid LUMI_BASE_URL: ${url}`);
  }
  const host = parsed.hostname || '127.0.0.1';
  const inferredPort = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  const port = Number.parseInt(inferredPort, 10);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid port in LUMI_BASE_URL: ${url}`);
  }
  const isLocalHost = host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0';
  return { host, port, isLocalHost };
}

async function isReachable(url) {
  try {
    const response = await fetch(url, { method: 'GET' });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isReachable(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function runShell(commandString, env = process.env) {
  return new Promise((resolve) => {
    const child = spawn(commandString, {
      stdio: 'inherit',
      shell: true,
      env,
    });
    child.on('exit', (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 1);
    });
  });
}

async function main() {
  const { host, port, isLocalHost } = parseBaseUrl(baseUrl);
  const env = {
    ...process.env,
    LUMI_BASE_URL: baseUrl,
    BASE_URL: baseUrl,
  };

  const alreadyRunning = await isReachable(baseUrl);
  if (alreadyRunning) {
    const code = await runShell(command, env);
    process.exit(code);
  }

  if (!isLocalHost) {
    console.error(`[with-dev-server] Base URL is remote and currently unreachable: ${baseUrl}`);
    process.exit(1);
  }

  const devChild = spawn('npm', ['run', 'dev', '--', '--host', host, '--port', String(port)], {
    stdio: 'inherit',
    env,
  });

  const stopDevServer = () => {
    if (devChild.killed) return;
    devChild.kill('SIGTERM');
  };

  process.on('SIGINT', () => {
    stopDevServer();
    process.exit(130);
  });

  process.on('SIGTERM', () => {
    stopDevServer();
    process.exit(143);
  });

  const ready = await waitForServer(baseUrl);
  if (!ready) {
    console.error(`[with-dev-server] Dev server did not become ready: ${baseUrl}`);
    stopDevServer();
    process.exit(1);
  }

  const code = await runShell(command, env);
  stopDevServer();
  process.exit(code);
}

main().catch((error) => {
  console.error('[with-dev-server] Fatal:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
