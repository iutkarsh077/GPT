# gpt

Full-stack chat app: **FastAPI** (AI / RAG), **Express** (sessions, GitHub OAuth, MongoDB), and **Next.js** (UI).

<video src="https://drive.google.com/uc?export=download&id=13Q2S9cYKqMYD858XmX1hyywBVRHHwswY" controls width="100%">
  <a href="https://drive.google.com/file/d/13Q2S9cYKqMYD858XmX1hyywBVRHHwswY/view?usp=sharing">Watch demo video</a>
</video>

![GPT chat UI — sidebar, conversation, and message input](https://res.cloudinary.com/dakddv1pm/image/upload/v1777199107/posts/ffzzpmpzaiien3bdkjmw.png)

## Layout

| Path | Role |
|------|------|
| `server/` | FastAPI app (`app.py`) — OpenAI, LangChain, Qdrant |
| `client/express/` | Express API — auth, DB, proxies to Python |
| `client/nextjs/` | Next.js 16 frontend |

## Prerequisites

- **Node.js** (for Express and Next.js)
- **Python 3** + virtualenv under `server/` (e.g. `.venv`; ignored by git)
- **MongoDB** and **Qdrant** (or URLs your `.env` files point to)
- **GitHub OAuth App** for sign-in (see below)

## GitHub OAuth setup

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**
2. Set:
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:4000/auth/github/callback`  
     (exact path — not `/api/auth/...`)
3. Copy the Client ID and Client Secret into `client/express/.env`:

```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```

Requested scopes: `read:user`, `user:email`, `repo` (so the app can read profile + list public/private repos).

### Migrating from Google auth

Google login was removed. Existing Google users / sessions will not work. For local/dev, clear the MongoDB `users` (and optionally `sessions`) collections, then sign in again with GitHub.

The GitHub access token is stored server-side for API calls (`GET /api/github/repos`) and is never returned to the browser. For production, consider encrypting that token at rest.

## Environment

Each app uses its own `.env` (gitignored):

- **`server/.env`** — API keys, Qdrant, `NODEJS_BACKEND_URI` (Express origin URL for CORS; must match where Express is reachable from the browser / server).
- **`client/express/.env`** — `PORT` (default `4000`), `SESSION_SECRET`, MongoDB, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, URLs to Next.js and the Python backend, etc.
- **`client/nextjs/.env`** or **`.env.local`** — public URLs / API base as your Next app expects.

Do not commit `.env` files or force-add them with `git add -f`.

## Python server

From `server/`:

```bash
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate   # macOS / Linux
pip install fastapi uvicorn python-dotenv openai pydantic langchain-openai langchain-qdrant langchain-core qdrant-client
uvicorn app:app --reload
```

Adjust the `pip install` line if you pin versions elsewhere.

## Express

From `client/express/`:

```bash
npm install
npm run dev
```

Uses **nodemon** and defaults to port **4000** unless `PORT` is set.

Useful auth endpoints:

- `GET /api/auth/github` — start OAuth
- `GET /auth/github/callback` — OAuth callback
- `GET /api/get-user` — current user (no access token)
- `GET /api/github/repos?page=1&per_page=100` — list repos for the signed-in user

## Next.js

From `client/nextjs/`:

```bash
npm install
npm run dev
```

Production: `npm run build` then `npm run start`. Lint: `npm run lint`.

## Typical local order

1. Start MongoDB and Qdrant (if local).
2. Start **Express** (`client/express`) with GitHub OAuth env vars set.
3. Start **FastAPI** (`server`) with `NODEJS_BACKEND_URI` aligned to your Express URL.
4. Start **Next.js** (`client/nextjs`) with env vars pointing at Express (and any public URLs you use).

## License

ISC (Express subpackage). Add a repo-level license if you want one for the whole project.
