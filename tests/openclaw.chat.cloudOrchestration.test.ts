import { afterEach, describe, expect, it, vi } from 'vitest';
import openclawChatHandler from '../api/openclaw/chat';

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

function geminiReplyResponse(reply: string): Response {
  return new Response(JSON.stringify({
    candidates: [
      {
        content: {
          parts: [{ text: reply }],
        },
      },
    ],
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('openclaw chat cloud orchestration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns cloud task decomposition with sub-agent skill selection trace', async () => {
    process.env.GEMINI_API_KEY = 'test-key';

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('generativelanguage.googleapis.com')) {
        return geminiReplyResponse(
          [
            'Final Output',
            'Action Steps',
            '1. Search flights from London to Jersey',
            '2. Compare hotels near St Helier',
            '3. Build day-by-day itinerary',
            'Next Action: confirm budget',
          ].join('\n'),
        );
      }
      if (url.startsWith('https://api.github.com/search/repositories')) {
        return new Response(JSON.stringify({
          items: [
            {
              full_name: 'openclaw/travel-agent-skills',
              name: 'travel-agent-skills',
              description: 'Flight hotel itinerary agent skills',
              stargazers_count: 52000,
              forks_count: 5000,
              default_branch: 'main',
            },
          ],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const req: MockReq = {
      method: 'POST',
      body: {
        query: 'Plan London to Jersey trip',
        response_language: 'en-GB',
      },
    };
    const res = createMockRes();

    await openclawChatHandler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.payload?.cloud_orchestration?.mode).toBe('cloud_reason_then_subagent_skill_execution');
    expect(Array.isArray(res.payload?.task_graph?.tasks)).toBe(true);
    expect((res.payload?.task_graph?.tasks || []).length).toBeGreaterThan(0);
    expect(Array.isArray(res.payload?.skill_selection_trace)).toBe(true);
    expect((res.payload?.skill_selection_trace || []).length).toBeGreaterThan(0);
    expect(Array.isArray(res.payload?.sub_agent_assignments)).toBe(true);
    expect((res.payload?.sub_agent_assignments || []).length).toBeGreaterThan(0);
    expect(
      (res.payload?.skill_selection_trace || []).every((item: any) =>
        typeof item.task_id === 'string' && typeof item.owner_agent === 'string'
      ),
    ).toBe(true);
  });

  it('still returns executable structured plan when model only asks for one clarification', async () => {
    process.env.GEMINI_API_KEY = 'test-key';

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('generativelanguage.googleapis.com')) {
        return geminiReplyResponse(
          [
            'Final Output',
            'I need one detail before final optimization.',
            'Next Action: what is your preferred budget range?',
          ].join('\n'),
        );
      }
      return new Response('', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const req: MockReq = {
      method: 'POST',
      body: {
        query: 'Build an executable hiring workflow with fallback steps',
        response_language: 'en-GB',
      },
    };
    const res = createMockRes();

    await openclawChatHandler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.payload?.status).toBe('partial');
    expect(String(res.payload?.reply || '')).toContain('Action Steps');
    expect(String(res.payload?.reply || '')).toMatch(/\n1\.\s+/);
    const gateR1 = Array.isArray(res.payload?.gate_decisions)
      ? res.payload.gate_decisions.find((gate: any) => gate.gate === 'gate_r1_require_constraints')
      : null;
    expect(gateR1?.decision).toBe('passed');
    expect(String(gateR1?.reason || '')).toContain('provisional_plan_with_assumptions');
  });
});
