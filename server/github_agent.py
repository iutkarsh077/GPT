"""GitHub code explorer agent using the OpenAI Agents SDK.

Docs: https://openai.github.io/openai-agents-python/
"""

from __future__ import annotations

import base64
import re
from dataclasses import dataclass
from urllib.parse import quote

import httpx
from agents import Agent, RunContextWrapper, Runner, function_tool

MAX_FILE_CHARS = 12000
GITHUB_API = "https://api.github.com"
GITHUB_BLOB_URL_RE = re.compile(
    r"https?://github\.com/(?P<owner>[^/]+)/(?P<repo>[^/]+)/blob/(?P<ref>[^/]+)/(?P<path>.+)",
    re.IGNORECASE,
)


@dataclass
class GithubAgentContext:
    github_token: str
    username: str | None = None


def _headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "gpt-utkarsh2004",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _encode_repo_path(path: str) -> str:
    """Encode each path segment so spaces/special chars work; keep '/' separators."""
    path = path.strip().lstrip("/")
    if not path:
        return ""
    return "/".join(quote(part, safe="") for part in path.split("/"))


def _auth_error_hint(status_code: int, body: str) -> str:
    if status_code in (401, 403):
        return (
            f"GitHub denied access ({status_code}). "
            "Your login may be missing the `repo` scope for private repositories. "
            "Revoke this app under GitHub → Settings → Applications → Authorized OAuth Apps, "
            "then sign in again with Continue with GitHub. "
            f"Details: {body[:400]}"
        )
    if status_code == 404:
        return (
            f"GitHub returned 404. For private repos this usually means the token cannot see the repo "
            "(missing `repo` scope or wrong owner/repo/path), not that the file is missing. "
            f"Details: {body[:400]}"
        )
    return f"GitHub error ({status_code}): {body[:500]}"


async def _github_get(token: str, path: str, params: dict | None = None) -> httpx.Response:
    async with httpx.AsyncClient(timeout=30.0) as client:
        return await client.get(
            f"{GITHUB_API}{path}",
            headers=_headers(token),
            params=params,
        )


async def _read_file(
    token: str,
    owner: str,
    repo: str,
    path: str,
    ref: str | None = None,
) -> str:
    encoded_path = _encode_repo_path(path)
    api_path = f"/repos/{owner}/{repo}/contents/{encoded_path}"
    params = {"ref": ref} if ref else None

    response = await _github_get(token, api_path, params=params)
    if response.status_code != 200:
        return _auth_error_hint(response.status_code, response.text)

    data = response.json()
    if isinstance(data, list):
        return f"'{path}' is a directory. Use list_repository_files instead."

    if data.get("type") != "file":
        return f"'{path}' is not a regular file (type={data.get('type')})."

    encoding = data.get("encoding")
    content = data.get("content") or ""
    if encoding == "base64":
        try:
            decoded = base64.b64decode(content).decode("utf-8", errors="replace")
        except Exception as exc:
            return f"Failed to decode file content: {exc}"
    elif data.get("download_url"):
        async with httpx.AsyncClient(timeout=30.0) as client:
            raw = await client.get(data["download_url"], headers=_headers(token))
            if raw.status_code != 200:
                return _auth_error_hint(raw.status_code, raw.text)
            decoded = raw.text
    else:
        decoded = str(content)

    if len(decoded) > MAX_FILE_CHARS:
        return (
            f"{decoded[:MAX_FILE_CHARS]}\n\n"
            f"[truncated: showing first {MAX_FILE_CHARS} of {len(decoded)} characters]"
        )
    return decoded


@function_tool
async def list_user_repositories(
    wrapper: RunContextWrapper[GithubAgentContext],
    page: int = 1,
) -> str:
    """List the authenticated user's GitHub repositories including private ones.
    Returns name, full_name, private flag, and description.
    """
    response = await _github_get(
        wrapper.context.github_token,
        "/user/repos",
        params={
            "per_page": 100,
            "page": max(1, page),
            "sort": "updated",
            "affiliation": "owner,collaborator,organization_member",
            "visibility": "all",
        },
    )
    if response.status_code != 200:
        return _auth_error_hint(response.status_code, response.text)

    repos = response.json()
    if not repos:
        return "No repositories found for this user."

    lines = []
    for repo in repos:
        private = "private" if repo.get("private") else "public"
        desc = repo.get("description") or ""
        lines.append(
            f"- {repo.get('full_name')} ({private}) lang={repo.get('language') or 'n/a'} — {desc}"
        )
    
    print("lines: ", lines)
    return "\n".join(lines)


@function_tool
async def list_repository_files(
    wrapper: RunContextWrapper[GithubAgentContext],
    owner: str,
    repo: str,
    path: str = "",
    ref: str = "main",
) -> str:
    """List files and directories at a path inside a GitHub repository (works for private repos).
    path is relative to the repo root; use empty string for the root directory.
    ref is the branch/tag/commit (default main).
    """
    encoded_path = _encode_repo_path(path)
    api_path = (
        f"/repos/{owner}/{repo}/contents/{encoded_path}"
        if encoded_path
        else f"/repos/{owner}/{repo}/contents"
    )

    response = await _github_get(
        wrapper.context.github_token,
        api_path,
        params={"ref": ref} if ref else None,
    )
    if response.status_code != 200:
        return _auth_error_hint(response.status_code, response.text)

    data = response.json()
    if isinstance(data, dict):
        return (
            f"Path '{path}' is a file (type={data.get('type')}, size={data.get('size')}). "
            "Use get_file_content to read it."
        )

    lines = []
    for item in data:
        lines.append(f"- [{item.get('type')}] {item.get('path')} ({item.get('size', 0)} bytes)")
    return "\n".join(lines) if lines else "Directory is empty."


@function_tool
async def get_file_content(
    wrapper: RunContextWrapper[GithubAgentContext],
    owner: str,
    repo: str,
    path: str,
    ref: str = "main",
) -> str:
    """Read a file from a GitHub repository by owner/repo/path (works for private repos with repo scope)."""
    return await _read_file(
        wrapper.context.github_token,
        owner,
        repo,
        path,
        ref=ref,
    )


@function_tool
async def get_file_from_github_url(
    wrapper: RunContextWrapper[GithubAgentContext],
    github_url: str,
) -> str:
    """Read a file from a full GitHub blob URL such as
    https://github.com/owner/repo/blob/main/path/to/file.ts
    Prefer this when the user pastes a GitHub file link (public or private).
    """
    match = GITHUB_BLOB_URL_RE.match(github_url.strip())
    if not match:
        return (
            "Invalid GitHub file URL. Expected format: "
            "https://github.com/{owner}/{repo}/blob/{branch}/{path}"
        )

    owner = match.group("owner")
    repo = match.group("repo")
    ref = match.group("ref")
    path = match.group("path")
    return await _read_file(
        wrapper.context.github_token,
        owner,
        repo,
        path,
        ref=ref,
    )


@function_tool
async def search_repository_code(
    wrapper: RunContextWrapper[GithubAgentContext],
    owner: str,
    repo: str,
    query: str,
) -> str:
    """Search for code inside a specific GitHub repository. Prefer get_file_content when you already know the path."""
    q = f"{query} repo:{owner}/{repo}"
    response = await _github_get(
        wrapper.context.github_token,
        "/search/code",
        params={"q": q, "per_page": 10},
    )
    if response.status_code != 200:
        return _auth_error_hint(response.status_code, response.text)

    items = response.json().get("items") or []
    if not items:
        return "No matching code found. Try list_repository_files or get_file_content with an exact path."

    lines = []
    for item in items:
        lines.append(
            f"- {item.get('path')} (score={item.get('score')}) url={item.get('html_url')}"
        )
    return "\n".join(lines)


GITHUB_AGENT_INSTRUCTIONS = """
You are a coding assistant that can inspect the user's GitHub repositories, including private ones.

When the user pastes a GitHub file URL (contains /blob/):
1. Call get_file_from_github_url with that exact URL first.

When the user mentions a repository name or asks about their code:
1. Use list_user_repositories to resolve the exact owner/repo full_name if needed.
2. Use list_repository_files to explore structure.
3. Use get_file_content (or search_repository_code) to read relevant files.
4. Answer based on the actual file contents you retrieved.

Rules:
- Private repositories are supported when the user authorized the `repo` OAuth scope.
- Prefer get_file_content / get_file_from_github_url over code search when the path is known.
- Prefer reading only the files needed for the question.
- If GitHub returns 401/403/404 on a private repo, tell the user to revoke the app and sign in again so `repo` scope is granted.
- For non-repo questions, answer normally using the provided chat/document context.
""".strip()


github_code_agent = Agent[GithubAgentContext](
    name="GitHub Code Assistant",
    instructions=GITHUB_AGENT_INSTRUCTIONS,
    model="gpt-5.4-mini",
    tools=[
        list_user_repositories,
        list_repository_files,
        get_file_content,
        get_file_from_github_url,
        search_repository_code,
    ],
)


async def run_github_code_agent(
    *,
    query: str,
    github_token: str,
    username: str | None,
    user_info: dict,
    retrieved_context: str,
    latest_chat_context: str,
) -> str:
    prompt = f"""
User information:
{user_info}

GitHub username (if known): {username or "unknown"}

Retrieved document context:
{retrieved_context or "No relevant document context found."}

Latest conversation history:
{latest_chat_context or "No previous conversation history."}

Current user question:
{query}

If the question includes a GitHub URL or repository/code request, use your GitHub tools.
Prefer retrieved document context for uploaded PDF questions.
""".strip()

    result = await Runner.run(
        starting_agent=github_code_agent,
        input=prompt,
        context=GithubAgentContext(
            github_token=github_token,
            username=username,
        ),
    )
    return result.final_output or ""
