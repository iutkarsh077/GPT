# How I Built AI Code Review for GitHub Pull Requests

Most teams still wait for a human to open a PR, skim the diff, and leave comments. I wanted something faster: the moment a pull request lands, an AI reviews it, posts a structured comment on GitHub, and emails the repo owner.

Here’s how that pipeline is written end to end.

---

## The idea in one sentence

**GitHub webhook → fetch PR files → enrich with full file content → LLM structured review → PR comment + email.**

---

## Architecture at a glance

```
GitHub PR event
      ↓
Express webhook (signature verify + orchestration)
      ↓
GitHub API: /pulls/{n}/files  (patches)
      ↓
Python FastAPI: /github-pr-review
      ├── fetch current file at head SHA
      ├── combine content + patch
      └── OpenAI structured output (4 fields)
      ↓
Express again
      ├── post comment on the PR
      └── email the owner
```

Two backends, one job:
- **Node/Express** talks to GitHub and the user.
- **Python/FastAPI** does the AI review.

---

## Step 1: Listen when a PR happens

When code review is enabled for a repo, i create a GitHub webhook that fires on `pull_request` events and points at our public URL.

On every pr request i do one critical thing first: **verify the signature**.

GitHub sends `X-Hub-Signature-256`. I HMAC the **raw request body** with my webhook secret and compare it safely. That’s why Express stores `req.rawBody` while parsing JSON - parsed objects would break the signature.

If verification fails, the app stop. No review, no email, no comment.

---

## Step 2: Collect what changed

Once the event is trusted, the webhook:
1. Reads `owner`, `repo`, `prNumber`, and `head_sha` from the payload
2. Loads the repo owner from MongoDB (GitHub token + email)
3. Calls GitHub:

```http
GET /repos/{owner}/{repo}/pulls/{prNumber}/files
```

That response is the PR’s changed files: filenames, status, additions/deletions, and the **unified patch**.

But a patch alone is incomplete. A `+` line without surrounding code is how reviewers miss bugs.

---

## Step 3: Give the model the full picture

The Express service forwards everything to Python:

```json
{
  "files": [ /* GitHub PR files */ ],
  "github_access_token": "...",
  "owner": "...",
  "repo": "...",
  "head_sha": "abc123"
}
```

Inside `/github-pr-review`, for each file I:

- Skip content fetch if the file was **removed**
- Otherwise fetch the **current file content at the PR head** using the same GitHub helper used by our chat agent
- Keep the **patch** next to it

All files are fetched in parallel with `asyncio.gather`, then assembled into one prompt:

> Here is the full file at head.  
> Here is exactly what changed.  
> Review both together.

That dual context is the core design choice. Diffs show intent. 

---

## Step 4: Force a review humans can actually read

I don’t ask the model for a free-form essay. Ie define a schema:

- `summary`
- `key_changes`
- `issues_found`
- `recommendations`

Then i call OpenAI with structured parsing (`responses.parse` + Pydantic model), so the API returns those four fields reliably.

The system prompt also enforces brevity - roughly **50 words per section** - so the review stays scannable on mobile and in email.

The model’s job becomes:
1. Understand risk in the summary  
2. List only important changes  
3. Call out real issues by severity  
4. Suggest concrete next steps  

No dumping entire files back. No invented code.

---

## Step 5: Deliver the review where developers already are

When Python returns the four fields, Express does two deliveries:

### 1) GitHub PR comment
Posts markdown to:

```http
POST /repos/{owner}/{repo}/issues/{prNumber}/comments
```

(PRs are issues under the hood.)

The comment looks like:

```md
## AI PR Review
### Summary
...
### Key changes
...
### Issues found
...
### Recommendations
...
```

### 2) Email to the repo owner
Uses the stored GitHub account email and Gmail SMTP, with the same four sections rendered cleanly.

So even if someone doesn’t open GitHub immediately, the review still reaches them.

---

## Why this design works

| Choice | Why it matters |
|---|---|
| Webhook-first | Reviews start without anyone clicking “run” |
| Signature verification | Prevents spoofed webhook traffic |
| Patch + full file | Better than diff-only review |
| Structured LLM output | Stable UI/email/comment format |
| Short sections | People actually read it |
| Comment + email | Meets developers in two places |

---

## What’s still imperfect (and honest)

- Comments currently post as the **user’s OAuth identity**, not a bot. A GitHub App would show `YourApp[bot]` I will figure out this thing will take sometime.
- Large PRs can hit token limits; truncation and file prioritization would help.

---

## How to use this in the app

1. Go to [https://sjhgshjs.xyz/](https://sjhgshjs.xyz/).
2. Open the **Code Review** dialog.
3. Enable the repository you want reviewed.

Once enabled, new pull requests on that repo will trigger an automatic AI review.