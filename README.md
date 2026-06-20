# VaultRAG — Role-Based AI Knowledge Assistant

A premium AI knowledge assistant for engineering teams, featuring role-based access control, real-time code sync via GitHub webhooks, and multimodal PRD/mockup understanding.

## Features

- **Feature A**: Role-filtered Knowledge Q&A with prompt injection defense
- **Feature B**: Automatic Knowledge Sync on code push (GitHub Webhooks)
- **Feature C**: Performance Analyzer & SME Locator
- **Feature D**: Multimodal PRD & Mockup Understanding + Scope Tracking
- **Feature E**: Automated Developer To-Dos
- **Feature F**: Role Management & Audit

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS v3 + Framer Motion |
| Backend | Node.js + Express |
| Database | MongoDB Atlas M0 (free tier) |
| AI Generation | Groq `llama-3.3-70b-versatile` |
| AI Embeddings | Gemini `gemini-embedding-001` (768-dim) |
| AI Vision | Gemini `gemini-2.5-flash` |
| Auth | JWT (in-memory) + httpOnly refresh cookie |
| Deploy | Vercel (frontend) + Render (backend) |

## ⚠️ Free Tier Notes

- **Render spins down after 15 minutes of inactivity.** The first request after inactivity can take ~60 seconds to spin back up. The frontend shows a "Waking up server..." skeleton on first load.
- **Groq daily request cap**: ~1,000–14,400 requests/day depending on the model. A daily budget tracker prevents raw 429 errors from surfacing to users.
- **MongoDB Atlas M0**: 512MB storage limit. Sufficient for prototyping.
- **Gemini Vision**: Flash-tier only (not Pro — Pro is paid-only as of April 2026).

## Setup

### Prerequisites
- Node.js >= 18
- MongoDB Atlas M0 free cluster
- Groq API key (console.groq.com)
- Google AI Studio API key (for Gemini)
- GitHub repository with webhook support

### 1. Clone and install

```bash
git clone <repo-url>
cd vaultrag

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Configure environment variables

```bash
# Server
cp server/.env.example server/.env
# Edit server/.env with your API keys

# Client
cp client/.env.example client/.env
# Edit client/.env with your backend URL
```

### 3. Set up MongoDB Atlas

1. Create a free M0 cluster at mongodb.com/atlas
2. Whitelist all IPs: `0.0.0.0/0` (required for Render's dynamic IPs)
3. Create a **Vector Search Index** named `vector_index` on the `KnowledgeChunks` collection:
   ```json
   {
     "fields": [{
       "type": "vector",
       "path": "embedding",
       "numDimensions": 768,
       "similarity": "cosine"
     }]
   }
   ```

### 4. Seed initial users

```bash
cd server && node src/scripts/seedUsers.js
```

This creates:
- `l1@vaultrag.dev` / `password123` (L1 — Junior Dev)
- `l2@vaultrag.dev` / `password123` (L2 — Senior Engineer)
- `l3@vaultrag.dev` / `password123` (L3 — PM/Admin)

### 5. Configure GitHub Webhook

In your GitHub repo → Settings → Webhooks → Add webhook:
- **Payload URL**: `https://your-render-url.onrender.com/api/webhooks/github`
- **Content type**: `application/json`
- **Secret**: Same value as `GITHUB_WEBHOOK_SECRET` in your `.env`
- **Events**: Just the push event

### 6. Run locally

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:5000

## Deployment

### Backend (Render)
1. Push `server/` to GitHub
2. Create Render Free Web Service, set root as `server/`
3. Add all environment variables from `server/.env.example`
4. Start command: `node src/index.js`

### Frontend (Vercel)
1. Push `client/` to GitHub
2. Connect Vercel, set root as `client/`
3. Set `VITE_API_BASE_URL` to your Render backend URL
4. Deploy
# vaultrag
