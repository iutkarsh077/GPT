import axios from "axios";
import User from "../models/User.js";

const GetGithubRepos = async (req, res) => {
  try {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
        code: "reauth_required",
      });
    }

    const userWithToken = await User.findById(req.user._id).select(
      "+githubAccessToken",
    );

    if (!userWithToken?.githubAccessToken) {
      return res.status(401).json({
        status: false,
        message: "GitHub access token missing. Please sign in again.",
        code: "reauth_required",
      });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(req.query.per_page) || 100));

    const response = await axios.get("https://api.github.com/user/repos", {
      headers: {
        Authorization: `Bearer ${userWithToken.githubAccessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "gpt-app",
      },
      params: {
        per_page: perPage,
        page,
        sort: "updated",
        affiliation: "owner,collaborator,organization_member",
      },
    });

    const repos = response.data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      html_url: repo.html_url,
      description: repo.description,
      language: repo.language,
      updated_at: repo.updated_at,
    }));

    return res.status(200).json({
      status: true,
      message: "Fetched GitHub repositories",
      data: repos,
      page,
      per_page: perPage,
    });
  } catch (error) {
    const status = error.response?.status;
    const rateLimitRemaining = error.response?.headers?.["x-ratelimit-remaining"];
    const retryAfter = error.response?.headers?.["retry-after"];

    if (status === 401) {
      return res.status(401).json({
        status: false,
        message: "GitHub token revoked or expired. Please sign in again.",
        code: "reauth_required",
      });
    }

    if (status === 403 || status === 429) {
      const isRateLimited =
        status === 429 ||
        rateLimitRemaining === "0" ||
        Boolean(retryAfter);

      return res.status(status).json({
        status: false,
        code: isRateLimited ? "rate_limited" : "forbidden",
        message: isRateLimited
          ? "GitHub API rate limit exceeded. Try again later."
          : "GitHub denied access to repositories. An organization may need to approve this OAuth App.",
        retry_after: retryAfter || null,
      });
    }

    console.log(error.response?.data || error.message);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch GitHub repositories",
    });
  }
};

export default GetGithubRepos;
