import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('openclaw chat link audit', () => {
  const previousGeminiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    if (typeof previousGeminiKey === 'string') {
      process.env.GEMINI_API_KEY = previousGeminiKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  });

  it('replaces 403 links with verified fallback links', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('generativelanguage.googleapis.com')) {
        return geminiReplyResponse(
          [
            'Final Output',
            'Use this hotel: https://www.handpickedhotels.co.uk/hotels/the-club-hotel-and-spa/',
            'Next Action: confirm booking.',
          ].join('\n'),
        );
      }
      if (url.includes('handpickedhotels.co.uk')) {
        return new Response('', { status: 403 });
      }
      if (url.includes('booking.com/searchresults.html')) {
        return new Response('', { status: 200 });
      }
      return new Response('', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const req: MockReq = {
      method: 'POST',
      body: {
        query: 'Plan my Jersey trip with hotel link',
        response_language: 'en-GB',
      },
    };
    const res = createMockRes();

    await openclawChatHandler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.payload?.success).toBe(true);
    expect(String(res.payload?.reply || '')).not.toContain('handpickedhotels.co.uk');
    expect(String(res.payload?.reply || '')).toContain('booking.com/searchresults.html');
    expect(res.payload?.link_audit?.replaced_count).toBeGreaterThanOrEqual(1);
    const r8 = Array.isArray(res.payload?.gate_decisions)
      ? res.payload.gate_decisions.find((gate: any) => gate.gate === 'gate_r8_data_authenticity_required')
      : null;
    expect(r8?.decision).toBe('passed');
  });

  it('downgrades status when blocked links cannot be verified', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('generativelanguage.googleapis.com')) {
        return geminiReplyResponse(
          'Final Output\nUse this source: https://blocked.example.com/resource\nNext Action: proceed',
        );
      }
      if (url.includes('blocked.example.com')) {
        return new Response('', { status: 403 });
      }
      if (url.includes('google.com/search') || url.includes('duckduckgo.com')) {
        return new Response('', { status: 503 });
      }
      return new Response('', { status: 503 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const req: MockReq = {
      method: 'POST',
      body: {
        query: 'Find official resource links',
        response_language: 'en-GB',
      },
    };
    const res = createMockRes();

    await openclawChatHandler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.payload?.status).toBe('partial');
    const r8 = Array.isArray(res.payload?.gate_decisions)
      ? res.payload.gate_decisions.find((gate: any) => gate.gate === 'gate_r8_data_authenticity_required')
      : null;
    expect(r8?.decision).toBe('blocked');
    expect(String(r8?.reason || '')).toContain('unreachable_or_blocked_links_detected');
    expect(res.payload?.link_audit?.unverified_count).toBeGreaterThanOrEqual(1);
  });
});
