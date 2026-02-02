# L.I.X. (Lumi Intent Exchange) MVP

A reverse auction marketplace where user intents become tradable assets, integrated into the Lumi keyboard and app.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Features

### Keyboard Flow
1. Long-press Space to enter Agent Mode
2. Type a purchase/service intent: `"帮我找一个设计师做Logo，预算500以内"`
3. Super Agent broadcasts to LIX market
4. **OfferComparisonCard** shows ranked offers within ~2s
5. Click "去市场查看全部" to open full market view

### App Flow
1. Open App → Navigate to **导航 (Navigation)** tab
2. Click **LIX 意图市场** entry card
3. **MarketHome**: View intents, publish new ones
4. **IntentDetail**: See ranked offers with validation badges
5. Accept offer → receive AcceptToken

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Keyboard Layer                       │
│  User Intent → Sentinel → Soul Architect → broadcast   │
└────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────┐
│                   LIX Core Services                     │
│  marketService → offerValidator → auctionEngine        │
│       ↓              ↓               ↓                 │
│  Mock Providers   8-Stage        Multi-Objective       │
│                   Pipeline        Ranking              │
└────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────┐
│                      App Layer                          │
│  MarketHome ←→ IntentDetail ←→ OfferComparisonCard     │
└────────────────────────────────────────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `services/lixTypes.ts` | Type definitions (IntentRequest, Offer, AcceptToken) |
| `services/marketService.ts` | Intent broadcast + mock providers |
| `services/offerValidator.ts` | 8-stage validation pipeline |
| `services/auctionEngine.ts` | SKU canonicalization + ranking |
| `services/lixStore.ts` | State management + observability |
| `components/MarketHome.tsx` | Intent list + publish modal |
| `components/IntentDetail.tsx` | Ranked offers + accept flow |
| `components/OfferComparisonCard.tsx` | Keyboard offer display |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/lix/broadcast` | POST | Broadcast intent, receive ranked offers |
| `/api/lix/accept` | POST | Accept offer, receive AcceptToken |

### Example: Broadcast Intent
```bash
curl -X POST http://localhost:3000/api/lix/broadcast \
  -H "Content-Type: application/json" \
  -d '{"category":"purchase","item":"iPhone 16 Pro Max","budget":9000}'
```

## Validation Pipeline

1. **Schema Validation** - JSON structure check
2. **Provider Verification** - Registry lookup
3. **URL Safety** - Domain allowlist + regex
4. **Price Verification** - ±15% warning, ±30% block
5. **SKU Match** - Canonicalization + cosine similarity
6. **Rate Limit** - Provider quota check

## Ranking Formula

```
score = 0.35×price + 0.25×reputation + 0.20×delivery + 0.20×sku_match - penalty
```

Chinese explanation generated for each offer (e.g., "最高性价比：价格合理 + 信誉良好").

## Testing

1. Open keyboard, enter: `"找一个5000元以内的手机"`
2. Verify 3+ offers appear in <3 seconds
3. Check validation badges (verified/warning)
4. Click offer → opens IntentDetail
5. Accept → AcceptToken generated
