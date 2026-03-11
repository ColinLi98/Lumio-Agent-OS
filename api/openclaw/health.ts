import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
    const geminiModel = process.env.OPENCLAW_GEMINI_MODEL || 'gemini-3.1-pro-preview';
    const modelPolicy = 'auto-super-agent';
    const hasGeminiKey = Boolean(
        String(process.env.GEMINI_API_KEY || '').trim() ||
        String(process.env.LUMI_GEMINI_API_KEY || '').trim() ||
        String(process.env.GOOGLE_API_KEY || '').trim() ||
        String(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim() ||
        String(process.env.VITE_GEMINI_API_KEY || '').trim()
    );
    const hasOpenAiKey = Boolean(String(process.env.OPENAI_API_KEY || '').trim());

    if (!hasGeminiKey && !hasOpenAiKey) {
        res.status(503).json({
            ok: false,
            service: 'openclaw-relay',
            model: 'none',
            model_policy: modelPolicy,
            status: 'missing_api_key',
            providers: {
                gemini_configured: hasGeminiKey,
                openai_fallback_configured: hasOpenAiKey,
            },
        });
        return;
    }

    res.status(200).json({
        ok: true,
        service: 'openclaw-relay',
        model: hasGeminiKey ? geminiModel : 'gpt-4.1-mini',
        model_policy: modelPolicy,
        status: hasGeminiKey ? 'ready' : 'fallback_only',
        providers: {
            gemini_configured: hasGeminiKey,
            openai_fallback_configured: hasOpenAiKey,
        },
    });
}
