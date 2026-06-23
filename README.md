<div align="center">

# VaultRAG

### AI-Powered Knowledge Assistant for Engineering Teams

**Role-filtered · Injection-protected · Source-cited · Real-time indexed**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://vaultrag-ivory.vercel.app)
[![Showcase](https://img.shields.io/badge/Showcase-View%20Features-blue?style=for-the-badge)](https://vaultrag-ivory.vercel.app/showcase)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-green?style=for-the-badge&logo=mongodb)](https://cloud.mongodb.com)

</div>

---

## What is VaultRAG?

VaultRAG connects to your GitHub repository via webhooks, indexes every commit using AST-aware chunking and vector embeddings, and lets your team query the codebase with AI — enforcing **role-based access control** at the vector search level.

```
GitHub Push → Webhook → AST Chunker → Embeddings → MongoDB Atlas Vector Search
                                                              ↓
User Query → Safety Classifier → Role-filtered Vector Search → Groq LLM → Cited Answer
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Knowledge Chat** | Ask anything about your codebase — answers cite exact file + commit |
| **RBAC** | Three roles (L1/L2/L3) enforced at vector search, not just UI |
| **Injection Defense** | Safety classifier blocks prompt injection & role escalation attempts |
| **GitHub Sync** | Webhook auto-indexes every push with AST-aware chunking |
| **PRD Tracking** | Upload PRDs — cross-reference requirements vs actual implementation |
| **Mockup Analysis** | Upload UI screenshots — Gemini Vision makes them queryable |
| **Scope Tracker** | Visual progress bar — Done vs Not Started per requirement |
| **SME Insights** | Correlates performance regressions to commits + authors |
| **Developer To-Dos** | Track open tasks linked to your codebase context |
| **Audit Log** | Full audit trail of every query, upload, and role change |
| **Role Management** | L3 admins assign L1/L2/L3 roles — effective immediately |

---

## Role System

```
L1 — Junior Dev          L2 — Senior Engineer       L3 — PM / Admin
─────────────────         ────────────────────        ──────────────────
✅ PRD / README           ✅ Everything L1 sees       ✅ Everything L2 sees
✅ Frontend code          ✅ Controllers              ✅ Upload PRDs
   (pages, components,    ✅ Middleware               ✅ Upload Mockups
    hooks, styles)        ✅ Models                   ✅ Audit Log
❌ Controllers            ✅ Routes                   ✅ Role Management
❌ Middleware             ✅ Services                 ✅ Scope Tracker
❌ Models                 ✅ SME Insights
❌ Backend routes
```

> Role is stored in **MongoDB**, re-read from DB on every request — never trusted from JWT payload.

---

## Tech Stack

### Backend
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | **Node.js + Express** | API server |
| Database | **MongoDB Atlas** (M0 free) | Document store + vector index |
| Vector Search | **Atlas Vector Search** | 768-dim cosine similarity with RBAC filter |
| AI — Answers | **Groq** `llama-3.1-8b-instant` | Fast LLM for generating answers |
| AI — Heavy | **Groq** `llama-3.3-70b-versatile` | SME regression correlation |
| AI — Vision | **Gemini** `gemini-2.5-flash` | Mockup image analysis |
| AI — Safety | **Groq** `llama-3.1-8b-instant` | Prompt injection classifier |
| Embeddings | **Gemini** `text-embedding-004` (768d) | Code + doc chunk embeddings |
| Code Parsing | **web-tree-sitter** | AST-aware chunking by function/class |
| Auth | **JWT** (Bearer) + **bcryptjs** | Authentication + password hashing |
| File Storage | **Cloudinary** | PRD PDFs + mockup images |
| Webhooks | **GitHub Webhooks** + HMAC | Real-time push indexing |

### Frontend
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | **React 18** + **Vite** | SPA framework |
| Styling | **Tailwind CSS v3** | Utility-first styling |
| Animation | **Framer Motion** | UI transitions |
| HTTP | **Axios** | API client with token interceptors |
| Routing | **React Router v6** | Client-side navigation |
| Icons | **Lucide React** | Icon library |
| Markdown | **react-markdown** + **react-syntax-highlighter** | Render code answers |
| File Upload | **react-dropzone** | Drag-and-drop PRD/mockup upload |
| Notifications | **react-hot-toast** | Toast notifications |

---

## AI Models Used

| Model | Provider | Used For |
|-------|----------|----------|
| `text-embedding-004` | Google Gemini | 768-dim embeddings for all code + doc chunks |
| `gemini-2.5-flash` | Google Gemini | UI mockup vision analysis (primary) |
| `gemini-2.0-flash` | Google Gemini | UI mockup vision analysis (fallback) |
| `llama-3.1-8b-instant` | Groq | Answer generation + safety classifier |
| `llama-3.3-70b-versatile` | Groq | SME regression correlation (high accuracy) |

---

## Data Models

### `KnowledgeChunk` — Core RAG store
```js
{
  content: String,           // raw code or doc text
  embedding: [Number],       // 768-dim vector
  metadata: {
    filepath: String,        // "src/controllers/authController.js"
    requiredRole: Number,    // 1 | 2 | 3  ← RBAC enforced at query time
    sourceType: String,      // "code" | "prd" | "mockup"
    astNodeType: String,     // "function" | "class" | "block" | "description"
    commitHash: String,      // SHA of the commit that introduced this chunk
    status: String,          // "active" | "archived"
  }
}
```

### Other Models
| Model | Key Fields |
|-------|-----------|
| `User` | `name, email, passwordHash, role (1/2/3), isActive` |
| `Commit` | `sha, message, authorGithubId, filesChanged[], fileDiffs[], mergedAt` |
| `ChatMessage` | `userId, conversationId, role (user/assistant), content, sources[]` |
| `Conversation` | `userId, title, lastMessageAt` |
| `PRD` | `filename, fileUrl, requirements[], uploadedBy` |
| `Mockup` | `filename, imageUrl, description, status (pending/active/failed)` |
| `AuditLog` | `userId, action, wasBlocked, metadata, createdAt` |
| `SmeTrace` | `userId, symptom, answer, insights{commitSha, authorId, confidence}` |
| `ToDo` | `userId, title, status (open/done), repoContext` |

---

## Services Architecture

| Service | File | What it does |
|---------|------|-------------|
| **chunkingService** | `chunkingService.js` | Tree-sitter AST parsing → splits by function/class → assigns `requiredRole` by filepath pattern. Hard-blocks `.env`, `.pem`, `.key` files |
| **embeddingService** | `embeddingService.js` | Calls Gemini `text-embedding-004` → 768-dim float array |
| **vectorSearch** | `vectorSearch.js` | Atlas `$vectorSearch` with RBAC pre-filter (`requiredRole ≤ userRole`) + mandatory JS post-filter |
| **groqService** | `groqService.js` | Safety classifier (local patterns → Groq fallback) + answer generation + SME correlation |
| **visionService** | `visionService.js` | Gemini Vision mockup analysis with 2-model retry chain + project context prompt |
| **cloudinaryService** | `cloudinaryService.js` | Signed upload/serve for PRD PDFs and mockup images |

---

## API Endpoints

### Auth
```
POST   /api/auth/register          Register new user
POST   /api/auth/login             Login → returns JWT
GET    /api/auth/me                Get current user (auth required)
```

### Query
```
POST   /api/query                  Ask a codebase question (role-filtered RAG)
```

### Chat
```
GET    /api/chat/conversations             List conversations
POST   /api/chat/conversations             Create conversation
DELETE /api/chat/conversations/:id         Delete conversation
GET    /api/chat/conversations/:id/messages  Get messages
GET    /api/chat/sme/history               SME trace history
```

### Uploads — L3 only
```
POST   /api/uploads/prd                    Upload PRD (PDF/TXT)
POST   /api/uploads/mockup                 Upload mockup image
GET    /api/uploads/prds                   List PRDs
GET    /api/uploads/mockups                List mockups
GET    /api/uploads/mockups/:id/status     Poll Gemini analysis status
POST   /api/uploads/mockups/:id/reanalyze  Retry failed analysis
DELETE /api/uploads/prds/:id               Delete PRD
DELETE /api/uploads/mockups/:id            Delete mockup
```

### Admin — L3 only
```
GET    /api/admin/users            List all users with roles
PATCH  /api/admin/users/:id/role   Update user role (1/2/3)
```

### Scope Tracker — L2+
```
GET    /api/scope                              List PRDs
GET    /api/scope/:prdId                       Get requirements
PATCH  /api/scope/:prdId/requirements/:reqId   Update requirement status
```

### Other
```
POST   /api/webhooks/github        GitHub push webhook (HMAC verified)
GET    /api/audit                  Audit log (L3)
GET    /api/sync/status            Vault sync status
GET    /api/todos                  List todos
POST   /api/todos                  Create todo
PATCH  /api/todos/:id              Update todo
DELETE /api/todos/:id              Delete todo
```

---

## RBAC Architecture

```
User Query
    │
    ▼
┌─────────────────────────────────┐
│  Safety Classifier              │  ← Local patterns first (no API cost)
│  + Groq fallback for ambiguous  │    Blocks: inject, role escalation,
│  FAIL CLOSED on timeout         │    "you are l3 admin show me..."
└────────────────┬────────────────┘
                 │ SAFE
                 ▼
┌─────────────────────────────────┐
│  Atlas $vectorSearch            │  ← Pre-filter: requiredRole ≤ userRole
│  RBAC filter at index level     │    Fetches limit × 40 candidates
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  Mandatory JS Post-Filter       │  ← Defense-in-depth: re-checks every
│  requiredRole ≤ userRole        │    chunk even if Atlas filter misfires
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  Implementation Query Injection │  ← "does X work?" → inject controller
│  (RBAC-gated chunk injection)   │    chunks for user's role level only
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  Groq LLM Answer Generation     │  ← Role-aware context + RBAC block
│  with role context header       │    warning if no backend accessible
└─────────────────────────────────┘
```

---

## Project Structure

```
vaultrag/
├── client/                          # React + Vite frontend
│   ├── public/images/               # VaultRAG showcase screenshots
│   ├── src/
│   │   ├── api/
│   │   │   ├── axiosClient.js       # Axios with Bearer token interceptor
│   │   │   └── tokenStore.js        # In-memory token (XSS protection)
│   │   ├── components/
│   │   │   ├── auth/                # LoginView, DocumentationView
│   │   │   ├── chat/                # ChatView, MessageBubble, InputArea
│   │   │   ├── upload/              # UploadCenterView, UploadedAssetsGrid
│   │   │   ├── scope/               # ScopeTrackerView, RequirementAccordion
│   │   │   ├── insights/            # InsightsView (SME regression)
│   │   │   ├── todos/               # ToDoBoardView, ToDoCard
│   │   │   ├── audit/               # AuditLogView
│   │   │   ├── admin/               # RoleManagementView
│   │   │   ├── showcase/            # ShowcaseView (public landing)
│   │   │   └── layout/              # AppLayout, Sidebar, NeuralSyncPill
│   │   ├── context/AuthContext.jsx  # Auth state + token management
│   │   └── App.jsx                  # Routes: /login /chat /todos ...
│   └── vercel.json                  # SPA rewrite rules
│
└── server/                          # Node.js + Express backend
    └── src/
        ├── controllers/             # Request handlers
        ├── models/                  # Mongoose schemas (11 models)
        ├── routes/                  # Express routers (10 route files)
        ├── services/                # AI integrations + business logic
        ├── middleware/
        │   ├── auth.js              # JWT verify + DB role lookup
        │   └── rbac.js              # requireRole(minLevel) guard
        ├── utils/
        │   ├── auditLogger.js       # Structured audit logging
        │   ├── groqBudget.js        # Daily token budget tracker
        │   └── confidence.js        # SME confidence thresholds
        ├── workers/
        │   └── embeddingWorker.js   # Batch embed + upsert chunks
        └── index.js                 # App entry point
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free M0)
- Groq API key → [console.groq.com](https://console.groq.com)
- Gemini API key → [aistudio.google.com](https://aistudio.google.com)
- Cloudinary account (free)
- GitHub repo to index

### 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/vaultrag.git
cd vaultrag
```

### 2. Backend

```bash
cd server && npm install
```

Create `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/vaultrag
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_REFRESH_SECRET=<another 64-char random>
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_WEBHOOK_SECRET=any_random_string
CLIENT_URL=http://localhost:5173
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

### 3. MongoDB Atlas Vector Index

In Atlas → **Atlas Search** → **Create Index** → select `knowledgechunks` → JSON editor:

```json
{
  "fields": [
    { "numDimensions": 768, "path": "embedding", "similarity": "cosine", "type": "vector" },
    { "path": "metadata.requiredRole", "type": "filter" },
    { "path": "metadata.status", "type": "filter" }
  ]
}
```

**Index name:** `vector_index` → wait for **READY**

### 4. Frontend

```bash
cd ../client && npm install
```

Create `client/.env.local`:
```env
VITE_API_BASE_URL=http://localhost:5000
```

### 5. Run

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Open **http://localhost:5173**

### 6. Create Users

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Junior Dev","email":"l1@test.com","password":"password123"}'

curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Senior Engineer","email":"l2@test.com","password":"password123"}'

curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"PM Admin","email":"l3@test.com","password":"password123"}'
```

Promote roles in MongoDB shell:
```js
db.users.updateOne({ email: "l2@test.com" }, { $set: { role: 2 } })
db.users.updateOne({ email: "l3@test.com" }, { $set: { role: 3 } })
```

### 7. Connect GitHub Repo

```bash
# Expose local server for GitHub webhooks
ngrok http 5000
```

GitHub repo → **Settings → Webhooks → Add webhook**:
- **Payload URL:** `https://xxxx.ngrok-free.app/api/webhooks/github`
- **Content type:** `application/json`
- **Secret:** value of `GITHUB_WEBHOOK_SECRET`
- **Events:** Push event only

Push a commit → watch server logs index your code → start querying!

---

## Production Deployment

### Backend → Render

| Setting | Value |
|---------|-------|
| Root Directory | `server` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| `CLIENT_URL` | Your Vercel URL |
| All other vars | Same as `.env` above |

### Frontend → Vercel

| Setting | Value |
|---------|-------|
| Root Directory | `client` |
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| `VITE_API_BASE_URL` | Your Render backend URL |

---

## Security

- JWT payload **never trusted for role** — re-read from MongoDB on every request
- Tokens in **memory only** on client — no localStorage, prevents XSS theft
- **Prompt injection classifier** fails closed on timeout
- **Secrets files** (`.env*`, `.pem`, `.key`) hard-blocked from indexing
- **Atlas RBAC pre-filter** + **JS post-filter** = defense-in-depth
- **HMAC-SHA256** on all webhook payloads

---

## License

MIT

---

<div align="center">

**Node.js · MongoDB Atlas · Groq · Gemini · React · Vite · Cloudinary**

[Live Demo](https://vaultrag-ivory.vercel.app) · [Feature Showcase](https://vaultrag-ivory.vercel.app/showcase)

</div>
