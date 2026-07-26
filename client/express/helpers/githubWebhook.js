import axios from "axios";

const GITHUB_API = "https://api.github.com";

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "gpt-code-review",
  };
}

function getWebhookCallbackUrl() {
  const url = process.env.GITHUB_WEBHOOK_URL?.trim();
  if (!url) {
    throw new Error(
      "GITHUB_WEBHOOK_URL is not set. Use your public API URL, e.g. https://xxxx.ngrok-free.app/api/webhooks/github",
    );
  }
  return url.replace(/\/$/, "");
}


export async function createRepoWebhook({ token, owner, repo }) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("GITHUB_WEBHOOK_SECRET is not set");
  }

  const callbackUrl = getWebhookCallbackUrl();
  const headers = githubHeaders(token);

  const existing = await axios.get(
    `${GITHUB_API}/repos/${owner}/${repo}/hooks`,
    { headers, params: { per_page: 100 } },
  );

  const match = (existing.data || []).find(
    (hook) => hook.config?.url === callbackUrl,
  );

  if (match) {
    await axios.patch(
      `${GITHUB_API}/repos/${owner}/${repo}/hooks/${match.id}`,
      {
        active: true,
        events: ["pull_request"],
        config: {
          url: callbackUrl,
          content_type: "json",
          secret,
          insecure_ssl: "0",
        },
      },
      { headers },
    );
    return String(match.id);
  }

  const created = await axios.post(
    `${GITHUB_API}/repos/${owner}/${repo}/hooks`,
    {
      name: "web",
      active: true,
      events: ["pull_request"],
      config: {
        url: callbackUrl,
        content_type: "json",
        secret,
        insecure_ssl: "0",
      },
    },
    { headers },
  );

  return String(created.data.id);
}


export async function deleteRepoWebhook({ token, owner, repo, webhookId }) {
  if (!webhookId) return;

  try {
    await axios.delete(
      `${GITHUB_API}/repos/${owner}/${repo}/hooks/${webhookId}`,
      { headers: githubHeaders(token) },
    );
  } catch (error) {
    if (error.response?.status === 404) return;
    throw error;
  }
}
