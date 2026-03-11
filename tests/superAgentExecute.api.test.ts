import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/super-agent/execute';
import capsuleApprovalHandler from '../api/super-agent/capsule-approval';
import { resetCapsuleApprovalStoreForTests } from '../services/policy-engine/capsuleApprovalStore.js';

const processWithReActMock = vi.fn();
const setApiKeyMock = vi.fn();

vi.mock('../services/superAgentService.js', () => ({
  getSuperAgent: () => ({
    processWithReAct: processWithReActMock,
    setApiKey: setApiKeyMock,
  }),
}));

type MockReq = {
  method: string;
  body?: any;
};

type MockRes = {
  statusCode: number;
  payload: any;
  headers: Record<string, string>;
  status: (code: number) => MockRes;
  json: (payload: any) => MockRes;
  setHeader: (key: string, value: string) => void;
  end: () => void;
};

function createMockRes(): MockRes {
  return {
    statusCode: 200,
    payload: undefined,
    headers: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.payload = payload;
      return this;
    },
    setHeader(key: string, value: string) {
      this.headers[key] = value;
    },
    end() {
      // no-op
    },
  };
}

function buildMockAgentResult() {
  return {
    answer: 'ok',
    toolsUsed: [],
    toolResults: [],
    confidence: 0.88,
    executionTimeMs: 21,
    turns: 1,
    reasoning_protocol: {
      version: 'v1.1',
      mode: 'full',
      methods_applied: ['first_principles', 'five_whys'],
      root_problem: 'root problem',
      recommended_strategy: 'recommended strategy',
      confidence: 0.76,
      artifacts: {
        first_principles: {
          assumptions: ['a'],
          base_facts: ['b'],
          key_levers: ['c'],
        },
      },
    },
  };
}

describe('super-agent execute api', () => {
  beforeEach(() => {
    processWithReActMock.mockReset();
    setApiKeyMock.mockReset();
    resetCapsuleApprovalStoreForTests();
  });

  it('returns 400 when query is missing', async () => {
    const req: MockReq = {
      method: 'POST',
      body: {},
    };
    const res = createMockRes();
    await handler(req as any, res as any);

    expect(res.statusCode).toBe(400);
    expect(res.payload?.success).toBe(false);
  });

  it('passes reasoning_mode to super agent and returns reasoning_protocol', async () => {
    processWithReActMock.mockResolvedValue(buildMockAgentResult());
    const req: MockReq = {
      method: 'POST',
      body: {
        query: '请帮我拆解这个任务',
        api_key: 'demo-key',
        reasoning_mode: 'full',
      },
    };
    const res = createMockRes();
    await handler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(setApiKeyMock).toHaveBeenCalledWith('demo-key');
    expect(processWithReActMock).toHaveBeenCalledWith(
      '请帮我拆解这个任务',
      expect.any(Object),
      'full'
    );
    expect(res.payload?.success).toBe(true);
    expect(res.payload?.reasoning_protocol?.mode).toBe('full');
    expect(res.payload?.policy_sync?.server_policy_version).toBeTruthy();
    expect(res.payload?.policy_sync?.server_policy_fingerprint).toBeTruthy();
  });

  it('defaults invalid reasoning_mode to auto', async () => {
    processWithReActMock.mockResolvedValue(buildMockAgentResult());
    const req: MockReq = {
      method: 'POST',
      body: {
        query: '分析一下这个问题',
        api_key: 'demo-key',
        reasoning_mode: 'invalid_mode',
      },
    };
    const res = createMockRes();
    await handler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(processWithReActMock).toHaveBeenCalledWith(
      '分析一下这个问题',
      expect.any(Object),
      'auto'
    );
  });

  it('returns 503 when gemini api key is missing', async () => {
    const keys = [
      'GEMINI_API_KEY',
      'LUMI_GEMINI_API_KEY',
      'GOOGLE_API_KEY',
      'GOOGLE_GENERATIVE_AI_API_KEY',
      'VITE_GEMINI_API_KEY',
      'NEXT_PUBLIC_GEMINI_API_KEY',
    ] as const;
    const backup = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    keys.forEach((key) => { delete process.env[key]; });

    try {
      const req: MockReq = {
        method: 'POST',
        body: {
          query: '分析一下这个问题',
        },
      };
      const res = createMockRes();
      await handler(req as any, res as any);

      expect(res.statusCode).toBe(503);
      expect(res.payload?.error).toBe('gemini_api_key_missing');
      expect(processWithReActMock).not.toHaveBeenCalled();
    } finally {
      keys.forEach((key) => {
        const value = backup[key];
        if (typeof value === 'string') {
          process.env[key] = value;
        } else {
          delete process.env[key];
        }
      });
    }
  });

  it('gates capsule egress and waits for approval before cloud execution', async () => {
    const req: MockReq = {
      method: 'POST',
      body: {
        query: '帮我发到市场',
        api_key: 'demo-key',
        selected_text: 'Contact me at test@example.com',
        data: {
          egress_target: 'market',
          contains_pii: true,
        },
      },
    };
    const res = createMockRes();
    await handler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.payload?.runtime_status).toBe('WAITING_USER');
    expect(res.payload?.current_wait?.node_id).toBe('capsule_approval');
    expect(Array.isArray(res.payload?.policy_decision_ids)).toBe(true);
    expect(processWithReActMock).not.toHaveBeenCalled();
  });

  it('resumes execution after capsule approval token is approved', async () => {
    processWithReActMock.mockResolvedValue(buildMockAgentResult());

    const initialReq: MockReq = {
      method: 'POST',
      body: {
        query: '帮我发到市场',
        api_key: 'demo-key',
        selected_text: 'Contact me at test@example.com',
        data: {
          egress_target: 'market',
          contains_pii: true,
        },
      },
    };
    const initialRes = createMockRes();
    await handler(initialReq as any, initialRes as any);
    expect(initialRes.statusCode).toBe(200);
    expect(initialRes.payload?.runtime_status).toBe('WAITING_USER');
    const token = String(initialRes.payload?.capsule_approval_token || '');
    expect(token).toBeTruthy();
    expect(processWithReActMock).not.toHaveBeenCalled();

    const approvalReq: MockReq = {
      method: 'POST',
      body: {
        token,
        decision: 'approve',
      },
    };
    const approvalRes = createMockRes();
    await capsuleApprovalHandler(approvalReq as any, approvalRes as any);
    expect(approvalRes.statusCode).toBe(200);
    expect(approvalRes.payload?.status).toBe('APPROVED');

    const resumeReq: MockReq = {
      method: 'POST',
      body: {
        query: '帮我发到市场',
        api_key: 'demo-key',
        selected_text: 'Contact me at test@example.com',
        capsule_approval_token: token,
        data: {
          egress_target: 'market',
          contains_pii: true,
        },
      },
    };
    const resumeRes = createMockRes();
    await handler(resumeReq as any, resumeRes as any);

    expect(resumeRes.statusCode).toBe(200);
    expect(resumeRes.payload?.success).toBe(true);
    expect(resumeRes.payload?.capsule_approval_status).toBe('APPROVED');
    expect(processWithReActMock).toHaveBeenCalledTimes(1);
  });

  it('attaches runtime envelope when agent-kernel is enabled', async () => {
    processWithReActMock.mockResolvedValue({
      ...buildMockAgentResult(),
      task_graph: {
        tasks: [
          {
            id: 't1',
            title: 'Search',
            required_capabilities: ['search.web'],
          },
        ],
        edges: [],
        critical_path: ['t1'],
        parallel_groups: [['t1']],
      },
    });

    const previous = process.env.SUPERAGENT_AGENT_KERNEL_ENABLED;
    process.env.SUPERAGENT_AGENT_KERNEL_ENABLED = 'true';

    try {
      const req: MockReq = {
        method: 'POST',
        body: {
          query: 'run kernel',
          api_key: 'demo-key',
        },
      };
      const res = createMockRes();
      await handler(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.payload?.runtime_task_id).toBeTruthy();
      expect(res.payload?.runtime_status).toBeTruthy();
      expect(Array.isArray(res.payload?.policy_decision_ids)).toBe(true);
      expect(res.payload?.policy_sync?.status).toBeTruthy();
    } finally {
      if (typeof previous === 'string') {
        process.env.SUPERAGENT_AGENT_KERNEL_ENABLED = previous;
      } else {
        delete process.env.SUPERAGENT_AGENT_KERNEL_ENABLED;
      }
    }
  });

  it('respects percentage rollout and skips kernel when rollout is 0%', async () => {
    processWithReActMock.mockResolvedValue({
      ...buildMockAgentResult(),
      task_graph: {
        tasks: [
          {
            id: 't1',
            title: 'Search',
            required_capabilities: ['search.web'],
          },
        ],
        edges: [],
        critical_path: ['t1'],
        parallel_groups: [['t1']],
      },
    });

    const previousEnabled = process.env.SUPERAGENT_AGENT_KERNEL_ENABLED;
    const previousRollout = process.env.SUPERAGENT_AGENT_KERNEL_ROLLOUT_PERCENT;
    delete process.env.SUPERAGENT_AGENT_KERNEL_ENABLED;
    process.env.SUPERAGENT_AGENT_KERNEL_ROLLOUT_PERCENT = '0';

    try {
      const req: MockReq = {
        method: 'POST',
        body: {
          query: 'rollout disabled',
          api_key: 'demo-key',
          user_id: 'rollout-user-0',
        },
      };
      const res = createMockRes();
      await handler(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.payload?.agent_kernel_rollout?.enabled).toBe(false);
      expect(res.payload?.agent_kernel_rollout?.rollout_percent).toBe(0);
      expect(res.payload?.runtime_task_id).toBeUndefined();
    } finally {
      if (typeof previousEnabled === 'string') {
        process.env.SUPERAGENT_AGENT_KERNEL_ENABLED = previousEnabled;
      } else {
        delete process.env.SUPERAGENT_AGENT_KERNEL_ENABLED;
      }
      if (typeof previousRollout === 'string') {
        process.env.SUPERAGENT_AGENT_KERNEL_ROLLOUT_PERCENT = previousRollout;
      } else {
        delete process.env.SUPERAGENT_AGENT_KERNEL_ROLLOUT_PERCENT;
      }
    }
  });

  it('enables kernel when rollout percentage is 100%', async () => {
    processWithReActMock.mockResolvedValue({
      ...buildMockAgentResult(),
      task_graph: {
        tasks: [
          {
            id: 't1',
            title: 'Search',
            required_capabilities: ['search.web'],
          },
        ],
        edges: [],
        critical_path: ['t1'],
        parallel_groups: [['t1']],
      },
    });

    const previousEnabled = process.env.SUPERAGENT_AGENT_KERNEL_ENABLED;
    const previousRollout = process.env.SUPERAGENT_AGENT_KERNEL_ROLLOUT_PERCENT;
    delete process.env.SUPERAGENT_AGENT_KERNEL_ENABLED;
    process.env.SUPERAGENT_AGENT_KERNEL_ROLLOUT_PERCENT = '100';

    try {
      const req: MockReq = {
        method: 'POST',
        body: {
          query: 'rollout enabled',
          api_key: 'demo-key',
          user_id: 'rollout-user-100',
        },
      };
      const res = createMockRes();
      await handler(req as any, res as any);

      expect(res.statusCode).toBe(200);
      expect(res.payload?.agent_kernel_rollout?.enabled).toBe(true);
      expect(res.payload?.agent_kernel_rollout?.rollout_percent).toBe(100);
      expect(res.payload?.runtime_task_id).toBeTruthy();
      expect(res.payload?.runtime_status).toBeTruthy();
    } finally {
      if (typeof previousEnabled === 'string') {
        process.env.SUPERAGENT_AGENT_KERNEL_ENABLED = previousEnabled;
      } else {
        delete process.env.SUPERAGENT_AGENT_KERNEL_ENABLED;
      }
      if (typeof previousRollout === 'string') {
        process.env.SUPERAGENT_AGENT_KERNEL_ROLLOUT_PERCENT = previousRollout;
      } else {
        delete process.env.SUPERAGENT_AGENT_KERNEL_ROLLOUT_PERCENT;
      }
    }
  });

  it('rejects request when strict policy sync is required and client version mismatches', async () => {
    processWithReActMock.mockResolvedValue(buildMockAgentResult());
    const req: MockReq = {
      method: 'POST',
      body: {
        query: 'strict policy sync check',
        api_key: 'demo-key',
        require_policy_sync: true,
        client_policy_version: '0.0.0',
      },
    };
    const res = createMockRes();
    await handler(req as any, res as any);

    expect(res.statusCode).toBe(409);
    expect(res.payload?.success).toBe(false);
    expect(res.payload?.error).toBe('policy_version_mismatch');
    expect(res.payload?.policy_sync?.status).toBe('version_mismatch');
    expect(processWithReActMock).not.toHaveBeenCalled();
  });
});
