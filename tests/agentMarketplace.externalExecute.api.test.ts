import { afterEach, describe, expect, it } from 'vitest';
import handler from '../api/agent-market/external-execute';
import { getToolRegistry } from '../services/toolRegistry.js';

type MockReq = {
  method: string;
  body?: any;
};

type MockRes = {
  statusCode: number;
  payload: any;
  status: (code: number) => MockRes;
  json: (payload: any) => MockRes;
};

function createMockRes(): MockRes {
  return {
    statusCode: 200,
    payload: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.payload = payload;
      return this;
    },
  };
}

describe('agent-market external execute api', () => {
  const webTool = getToolRegistry().getTool('web_search');
  const originalExecute = webTool?.execute;

  afterEach(() => {
    if (webTool && originalExecute) {
      webTool.execute = originalExecute;
    }
  });

  it('returns 400 when query is missing', async () => {
    const req: MockReq = {
      method: 'POST',
      body: { input: {} },
    };
    const res = createMockRes();
    await handler(req as any, res as any);

    expect(res.statusCode).toBe(400);
    expect(res.payload?.success).toBe(false);
  });

  it('executes web_search and returns normalized external payload', async () => {
    expect(webTool).toBeTruthy();
    if (!webTool) return;

    webTool.execute = async () => ({
      success: true,
      summary: '已搜索到岗位',
      answer: '岗位搜索完成',
      results: [
        {
          title: 'Senior Backend Engineer',
          snippet: 'Shanghai · 55k-75k',
          url: 'https://jobs.example.com/backend',
          source: 'jobs.example.com',
        },
      ],
    });

    const req: MockReq = {
      method: 'POST',
      body: {
        trace_id: 'trace-ext-1',
        input: {
          query: '搜索后端岗位',
          domain: 'recruitment',
          locale: 'zh-CN',
        },
      },
    };
    const res = createMockRes();
    await handler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.payload?.success).toBe(true);
    expect(res.payload?.data?.source_tool).toBe('web_search');
    expect(res.payload?.data?.domain).toBe('knowledge');
    expect(Array.isArray(res.payload?.data?.evidence?.items)).toBe(true);
    expect(res.payload?.data?.evidence?.items?.length).toBe(1);
  });
});
