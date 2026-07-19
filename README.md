# Concourse AI ⚽

**GenAI Co-Pilot for FIFA World Cup 2026 Stadiums**

A production-grade platform that leverages Generative AI to enhance stadium operations and the fan experience during the FIFA World Cup 2026. Built for the Google PromptWars hackathon.

## 🏟️ What It Does

### For Fans — Multilingual Concierge
- **Multilingual Q&A** in English, Spanish, French, Portuguese, and Arabic (full RTL support)
- **Grounded on stadium data** — the model can't invent a gate number
- **Accessibility-aware routing** — wheelchair, low vision, deaf/HoH, cognitive support modes
- **Emergency escalation** — detects safety keywords and escalates to venue staff

### For Operators — Crowd Pulse Dashboard
- **Live zone density heatmap** with normal/watch/critical classification
- **AI-generated operational briefings** with prioritized, actionable recommendations
- **Sustainability metrics** — waste diversion, energy, and water status
- **"Simulate a Spike" demo** for dramatic live scenarios

### For Volunteers — Ops Digest
- **Shift-start briefings** generated from context feeds (weather, transit, crowd forecast)
- **SOP-grounded Q&A** — every answer cites the procedure it came from
- **Escalation detection** — emergency procedures displayed verbatim from SOPs

### For Transit — Smart Recommendations
- **Per-origin transit advice** using real shuttle/parking data
- **Sustainability notes** — informative, never preachy
- **Post-match timing advice** to avoid exit surges

## 🧠 AI Architecture

```
Fan/Operator/Volunteer → Hono API → Injection Guard → Prompt Builder → Gemini API
                                                                           ↓
                                              Zod Validation ← JSON Response
                                                    ↓
                               Structured Response / Deterministic Fallback
```

- **Prompt engineering**: 4 competition-grade prompts with anti-injection clauses
- **Grounded generation**: Gemini receives structured stadium data, not free-form context
- **JSON mode**: `responseMimeType: application/json` enforces parseable output
- **Zod validation**: Every response validated against a typed schema
- **Deterministic fallback**: If Gemini fails, users still get helpful (honest) answers

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| AI | Google Gemini (gemini-2.0-flash) via `@google/generative-ai` |
| Backend | Node.js + Hono (ultrafast web framework) + TypeScript |
| Frontend | React 19 + Vite + CSS Custom Properties (RTL-first) |
| Validation | Zod (runtime schema validation for all I/O) |
| Config | envalid (typed environment variables) |
| Data | In-memory seed data (Firestore-ready architecture) |

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### Setup

```bash
# 1. Clone and navigate
cd concourse-ai

# 2. Configure environment
cp .env.example backend/.env
# Edit backend/.env and add your GEMINI_API_KEY

# 3. Install and start backend
cd backend
npm install
npm run dev
# Server starts on http://localhost:8080

# 4. Install and start frontend (new terminal)
cd frontend
npm install
npm run dev
# App opens on http://localhost:5173
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | AI health check |
| GET | `/api/stadiums` | List all venues |
| GET | `/api/stadiums/:id/zones` | Get zones for a stadium |
| POST | `/api/concierge/chat` | Multilingual fan Q&A |
| POST | `/api/crowd/telemetry` | Ingest zone telemetry |
| GET | `/api/crowd/briefing` | AI operational briefing |
| GET | `/api/ops/digest` | Volunteer shift briefing |
| POST | `/api/ops/ask` | SOP-grounded Q&A |
| POST | `/api/transit/recommend` | Transit recommendation |

## 🌐 Multilingual & RTL

The concierge detects fan language automatically. Arabic responses include:
- `text_direction: "rtl"` in the API response
- CSS Logical Properties (`margin-inline-start`, `border-end-end-radius`)
- Font switching to Noto Sans Arabic
- Chat bubble alignment flip (user messages go left, AI goes right)

## ♿ Accessibility

- WCAG 2.1 AA compliant design
- Skip navigation link
- Semantic HTML with ARIA landmarks and live regions
- `prefers-reduced-motion` support
- Keyboard-navigable tab system
- Screen reader-friendly labels on all interactive elements

## 📁 Project Structure

```
concourse-ai/
├── backend/
│   ├── src/
│   │   ├── config.ts              # Typed env vars
│   │   ├── index.ts               # Hono app entry
│   │   ├── types/index.ts         # TypeScript types
│   │   ├── schemas/index.ts       # Zod runtime schemas
│   │   ├── services/
│   │   │   ├── gemini.service.ts   # Core AI wrapper
│   │   │   └── data-loader.ts     # Seed data store
│   │   ├── prompts/               # 4 prompt templates
│   │   ├── fallback/              # Deterministic fallbacks
│   │   ├── routers/               # API endpoints
│   │   └── middleware/            # Injection guard
│   └── seed-data/                 # Stadium/zone JSON
├── frontend/
│   └── src/
│       ├── App.tsx                # Root SPA shell
│       ├── api/client.ts          # Typed API client
│       └── components/            # 4 feature views
└── .env.example
```

## 🔒 Security

- **Prompt injection guard**: Regex filter strips 15+ known injection patterns
- **Anti-injection clauses**: Every prompt contains explicit instructions to ignore manipulative user input
- **No stack trace leaks**: Global error handler returns generic messages
- **Zod validation**: All request bodies validated before processing
- **CORS configured**: Only whitelisted origins allowed

## License

MIT — Built for the Google PromptWars Hackathon 2026
