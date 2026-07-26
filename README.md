# GPT

A full-stack AI chat app with GitHub OAuth, PDF-grounded answers (RAG), a GitHub code agent, real-time collaboration, and shareable conversations.

Built as three services: **Next.js** (UI) · **Express** (auth, sessions, MongoDB, sockets) · **FastAPI** (LLM, RAG, GitHub agent).

## Demo

Watch the project demo:

🔗 **https://youtu.be/Td0-T3-bkGg**

<video src="https://drive.google.com/uc?export=download&id=13Q2S9cYKqMYD858XmX1hyywBVRHHwswY" controls width="100%">
  <a href="https://drive.google.com/file/d/13Q2S9cYKqMYD858XmX1hyywBVRHHwswY/view?usp=sharing">Watch demo video</a>
</video>

![GPT chat UI — sidebar, conversation, and message input](https://res.cloudinary.com/dakddv1pm/image/upload/v1777199107/posts/ffzzpmpzaiien3bdkjmw.png)

---

## What this app can do

### Sign in with GitHub
- One-click login via GitHub OAuth
- Session cookies stored in MongoDB (no tokens exposed to the browser)
- Access token kept server-side so the app can call the GitHub API on your behalf

### Chat like a familiar AI assistant
- Create and switch between chat sessions from a sidebar
- Open chats by URL (`/chat/[chatId]`)
- Auto-generated titles for new conversations
- Markdown answers with a typing-style reveal in the UI

### GitHub code agent
- Toggle **Github Agent** in the composer to send questions through the AI backend
- The agent can list your repos, browse files, read file contents (including from GitHub URLs), and search code
- Works with public and private repos (via the `repo` OAuth scope)

### Ask questions about your PDFs (RAG)
- Upload a PDF (up to 10MB) into a chat
- File goes to AWS S3, then is chunked and embedded into Qdrant
- Later questions in that chat retrieve relevant chunks so answers stay grounded in your document
- Embeddings are scoped per user and chat

### Share conversations
- Copy a public share link (`/share/[chatId]`)
- Anyone with the link can read the conversation — no login required
- Share pages are read-only

### Collaborate in real time
- Chat owners can invite others by email
- Collaborators see the same chat and can participate
- Owners can list and remove collaborators
- Socket.IO keeps the room live: collaborators see pending queries and new messages as they happen

### Supporting capabilities
- Health checks on Express and FastAPI
- List signed-in user’s GitHub repos via API
- Logout clears the session and local user cache

---

## Architecture

```
Browser (Next.js :3000)
    │  REST + cookies + Socket.IO
    ▼
Express (:4000) ── MongoDB (users, sessions, chats)
    │  HTTP proxy
    ▼
FastAPI ── OpenAI · Qdrant · S3 (PDFs) · GitHub API (agent tools)
```

| Path | Role |
|------|------|
| `client/nextjs/` | Next.js App Router UI |
| `client/express/` | Auth, CRUD, S3 uploads, email invites, Socket.IO, proxy to Python |
| `server/` | FastAPI — RAG embeddings, LLM answers, GitHub agent |

---

## Tech stack

| Layer | Technologies |
|-------|----------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, shadcn/Base UI, Socket.IO client, react-markdown |
| API / auth | Express 5, Passport (GitHub), express-session + connect-mongo, Socket.IO |
| AI | FastAPI, OpenAI, LangChain, openai-agents, pypdf |
| Data | MongoDB (Mongoose), Qdrant (vectors), AWS S3 (PDFs) |
| Other | Nodemailer (collaboration invites), axios |

---

## Features in more detail

### Auth & security
- GitHub-only sign-in (`read:user`, `user:email`, `repo`)
- Middleware redirects unauthenticated users to `/auth` (share links stay public)
- GitHub access token never returned from `/get-user`

### Chat sessions
- Owned sessions plus sessions you’ve been invited to collaborate on
- Messages stored as query/content pairs per session

### AI path
- With **Github Agent** on, Express calls FastAPI `/query`
- FastAPI runs similarity search over the chat’s PDF embeddings, then the GitHub agent / LLM
- With the toggle off, the query is saved but the AI backend is not called

### PDF pipeline
1. Client requests a presigned S3 upload URL from Express  
2. PDF uploads to S3  
3. Express asks FastAPI `/embed-file` to download, chunk, and index into Qdrant  

### Collaboration & sockets
- Invite email via SMTP
- Real-time events: `join-chat`, `leave-chat`, `chat:query-started`, `chat:message`, `chat:query-failed`

---

## Project layout

```
gpt/
├── client/
│   ├── nextjs/     # UI
│   └── express/    # Node API + sockets
├── server/         # FastAPI AI service
└── README.md
```

### Main UI routes

| Route | Description |
|-------|-------------|
| `/auth` | GitHub sign-in |
| `/chat` | Starts a new chat |
| `/chat/[chatId]` | Active conversation |
| `/share/[chatId]` | Public read-only share view |

---

## Prerequisites

- **Node.js** (Express + Next.js)
- **Python 3** + virtualenv under `server/`
- **MongoDB** and **Qdrant**
- **GitHub OAuth App**
- **OpenAI API key**
- **AWS S3** credentials (PDF upload / embed)
- **Gmail SMTP** (or compatible) for collaboration invites

---


## GitHub OAuth setup

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**
2. Set:
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:4000/auth/github/callback`
3. Put the Client ID and Client Secret in `client/express/.env` (see above)

Scopes used: `read:user`, `user:email`, `repo`.

### Migrating from Google auth

Google login was removed. Old Google users/sessions will not work. For local/dev, clear the MongoDB `users` (and optionally `sessions`) collections, then sign in again with GitHub.

---

## Run locally

Typical order:

1. Start **MongoDB** and **Qdrant**
2. Start **Express**
3. Start **FastAPI**
4. Start **Next.js**

### FastAPI (`server/`)

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
uvicorn app:app --reload
```

### Express (`client/express/`)

```bash
npm install
npm run dev
```

Defaults to port **4000**.

Useful endpoints:

- `GET /api/auth/github` — start OAuth
- `GET /auth/github/callback` — OAuth callback
- `GET /api/get-user` — current user (no access token)
- `GET /api/github/repos?page=1&per_page=100` — list repos
- `GET /health` — health check

### Next.js (`client/nextjs/`)

```bash
npm install
npm run dev
```

Production: `npm run build` then `npm run start`. Lint: `npm run lint`.

---

## API overview

### Express (selected)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/auth/github` | Start OAuth |
| GET | `/get-user` | Current session user |
| POST | `/query-resolver` | Save query; call AI when agent toggle is on |
| GET | `/create-new-session` | New chat |
| GET | `/all-chat-session` | Owned + collaborated chats |
| GET | `/get-chat-by-chatid` | Load messages |
| GET | `/share/:chatId` | Public share payload |
| POST | `/get-upload-url` | Presigned S3 upload |
| POST | `/embed-pdf` | Trigger PDF embedding |
| POST | `/send-email-invite` | Invite collaborator |
| GET | `/get-people-collaborate/:chatId` | List collaborators |
| POST | `/remove-collaborator` | Remove collaborator |

### FastAPI

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| POST | `/embed-file` | Index a PDF from S3 into Qdrant |
| POST | `/query` | RAG + GitHub agent / LLM answer |

---

## License

ISC (Express subpackage). Add a repo-level license if you want one for the whole project.
