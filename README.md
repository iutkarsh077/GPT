# gpt

Full-stack chat app: **FastAPI** (AI / RAG), **Express** (sessions, Google OAuth, MongoDB), and **Next.js** (UI).

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
- Google OAuth credentials if you use Google sign-in

## Environment

Each app uses its own `.env` (gitignored):

- **`server/.env`** — API keys, Qdrant, `NODEJS_BACKEND_URI` (Express origin URL for CORS; must match where Express is reachable from the browser / server).
- **`client/express/.env`** — `PORT` (default `4000`), `SESSION_SECRET`, MongoDB, Google OAuth, URLs to Next.js and the Python backend, etc.
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

## Next.js

From `client/nextjs/`:

```bash
npm install
npm run dev
```

Production: `npm run build` then `npm run start`. Lint: `npm run lint`.

## Typical local order

1. Start MongoDB and Qdrant (if local).
2. Start **Express** (`client/express`).
3. Start **FastAPI** (`server`) with `NODEJS_BACKEND_URI` aligned to your Express URL.
4. Start **Next.js** (`client/nextjs`) with env vars pointing at Express (and any public URLs you use).

## License

ISC (Express subpackage). Add a repo-level license if you want one for the whole project.
