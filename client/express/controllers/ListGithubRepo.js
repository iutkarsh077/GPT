import axios from "axios";
import User from "../models/User.js";
import {
  createRepoWebhook,
  deleteRepoWebhook,
} from "../helpers/githubWebhook.js";

const ListGithubRepo = async (req, res) => {
  try {
    const { _id: userId } = req.user;

    const githubAccessToken = await User.findById(userId).select(
      "githubAccessToken",
    );

    const headers = {
      Authorization: `Bearer ${githubAccessToken.githubAccessToken}`,
      Accept: "application/vnd.github+json",
    };

    const params = {
      visibility: "all",
      affiliation: "owner",
      sort: "updated",
      direction: "desc",
      per_page: 100,
    };

    const [page1, page2] = await Promise.all([
      axios.get("https://api.github.com/user/repos", {
        headers,
        params: { ...params, page: 1 },
      }),
      axios.get("https://api.github.com/user/repos", {
        headers,
        params: { ...params, page: 2 },
      }),
    ]);

    const githubRepos = [...page1.data, ...page2.data];

    const existingByGithubId = new Map(
      (await User.findById(userId))?.githubRepos?.map((repo) => [
        String(repo.id),
        {
          enableCodeReview: repo.enableCodeReview,
          webhookId: repo.webhookId ?? null,
        },
      ]) ?? [],
    );

    const repos = githubRepos.map((repo) => {
      const prev = existingByGithubId.get(String(repo.id));
      return {
        id: String(repo.id),
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        private: repo.private,
        defaultBranch: repo.default_branch,
        enableCodeReview: prev?.enableCodeReview ?? false,
        webhookId: prev?.webhookId ?? null,
      };
    });

    const user = await User.findByIdAndUpdate(
      userId,
      { githubRepos: repos },
      { new: true },
    );
    return res.status(200).json({
      message: "Github repos listed successfully",
      data: user.githubRepos,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to list github repos" });
  }
};

export default ListGithubRepo;

export const EnableDisableCodeReview = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { repoId } = req.params;

    const user = await User.findById(userId).select("+githubAccessToken");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.githubAccessToken) {
      return res.status(400).json({
        message: "GitHub access token missing. Sign in with GitHub again.",
      });
    }

    const repo = user.githubRepos.find(
      (r) => String(r.id) === String(repoId) || String(r._id) === String(repoId),
    );

    if (!repo) {
      return res.status(404).json({ message: "Github repo not found" });
    }

    const enable = !repo.enableCodeReview;

    if (enable) {
      const webhookId = await createRepoWebhook({
        token: user.githubAccessToken,
        owner: repo.owner,
        repo: repo.name,
      });
      repo.enableCodeReview = true;
      repo.webhookId = webhookId;
    } else {
      await deleteRepoWebhook({
        token: user.githubAccessToken,
        owner: repo.owner,
        repo: repo.name,
        webhookId: repo.webhookId,
      });
      repo.enableCodeReview = false;
      repo.webhookId = null;
    }

    await user.save();

    return res.status(200).json({
      message: enable
        ? "Code review enabled and webhook created"
        : "Code review disabled and webhook removed",
      data: repo,
    });
  } catch (error) {
    console.log(error);
    const githubMessage = error.response?.data?.message;
    return res.status(500).json({
      message:
        githubMessage ||
        error.message ||
        "Failed to enable/disable code review",
    });
  }
};
