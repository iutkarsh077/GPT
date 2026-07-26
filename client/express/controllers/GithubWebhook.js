import axios from "axios";
import crypto from "crypto";
import User from "../models/User.js";
import { sendPrReviewMail } from "../helpers/SendEmail.js";

function verifyGithubSignature(req, secret) {
  const signature = req.headers["x-hub-signature-256"];
  if (!signature) {
    console.log("Webhook verify failed: missing X-Hub-Signature-256 header");
    return false;
  }
  if (!req.rawBody || !Buffer.isBuffer(req.rawBody)) {
    console.log("Webhook verify failed: missing rawBody (body was parsed without raw bytes)");
    return false;
  }

  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", secret)
      .update(req.rawBody)
      .digest("hex");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);

  if (sigBuf.length !== expBuf.length) {
    console.log("Webhook verify failed: signature length mismatch (wrong secret or body altered)");
    return false;
  }

  return crypto.timingSafeEqual(sigBuf, expBuf);
}

export const GithubWebhook = async (req, res) => {
  try {
    console.log("GitHub webhook received", {
      url: req.originalUrl,
      event: req.headers["x-github-event"],
      hasSignature: Boolean(req.headers["x-hub-signature-256"]),
      hasRawBody: Boolean(req.rawBody),
      rawBodyBytes: req.rawBody?.length ?? 0,
    });

    const secret = process.env.GITHUB_WEBHOOK_SECRET?.trim();
    if (!secret) {
      console.log("Webhook verify failed: GITHUB_WEBHOOK_SECRET is not set");
      return res.status(401).json({ message: "Invalid signature" });
    }

    if (!verifyGithubSignature(req, secret)) {
      return res.status(401).json({ message: "Invalid signature" });
    }

    const event = req.headers["x-github-event"];
    const { action, repository, pull_request } = req.body;

    console.log("GitHub webhook:", { event, action, pull_request });

    if (event === "ping") {
      return res.status(200).json({ message: "pong" });
    }

    if (event === "pull_request") {
      const owner = repository?.owner?.login;
      const repo = repository?.name;
      const prNumber = pull_request?.number;
      const title = pull_request?.title;

      console.log("Pull request webhook:", {
        action,
        owner,
        repo,
        prNumber,
        title,
        htmlUrl: pull_request?.html_url,
      });

      const user = await User.findOne({ username: owner }).select(
        "githubAccessToken email username"
      );
      if (!user?.githubAccessToken) {
        console.log("Token not found");
        return res.status(404).json({ message: "Token not found" });
      }

      if (!user.email) {
        console.log("Owner email not found; skipping PR review email");
        return res.status(200).json({ message: "ok", emailed: false });
      }

      const headSha = pull_request?.head?.sha;
      if (!headSha) {
        console.log("PR head sha missing");
        return res.status(400).json({ message: "PR head sha missing" });
      }

      const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${user.githubAccessToken}`,
        },
      });

      const callGithubPrReview = await axios.post(
        `${process.env.PYTHON_BACKEND_URI}/github-pr-review`,
        {
          files: response.data,
          github_access_token: user.githubAccessToken,
          owner,
          repo,
          head_sha: headSha,
        }
      );

      const review = callGithubPrReview.data;
      if (
        !review?.status ||
        !review?.summary ||
        !review?.key_changes ||
        !review?.issues_found ||
        !review?.recommendations
      ) {
        console.log("PR review failed or incomplete report:", review);
        return res.status(502).json({ message: "PR review failed" });
      }

    const commentBody = `## AI PR Review

      ### Summary
      ${review.summary}

      ### Key changes
      ${review.key_changes}

      ### Issues found
      ${review.issues_found}

      ### Recommendations
      ${review.recommendations}
      `;

      await axios.post(
        `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
        { body: commentBody },
        {
          headers: {
            Authorization: `Bearer ${user.githubAccessToken}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      const emailed = await sendPrReviewMail({
        to: user.email,
        owner,
        repo,
        prNumber,
        title,
        htmlUrl: pull_request?.html_url,
        summary: review.summary,
        keyChanges: review.key_changes,
        issuesFound: review.issues_found,
        recommendations: review.recommendations,
      });

      console.log("PR review email:", { to: user.email, emailed });
    }

    return res.status(200).json({ message: "ok" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Webhook failed" });
  }
};
