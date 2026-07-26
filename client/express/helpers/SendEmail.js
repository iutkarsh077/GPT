import nodemailer from "nodemailer";

function createTransport() {
  const { SMTP_EMAIL, SMTP_PASSWORD } = process.env;

  if (!SMTP_EMAIL || !SMTP_PASSWORD) {
    console.error("SMTP credentials are missing");
    return null;
  }

  return {
    email: SMTP_EMAIL,
    transport: nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASSWORD,
      },
    }),
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendMail({ to, name, subject, link }) {
  const smtp = createTransport();
  if (!smtp) return false;

  await smtp.transport.verify();

  console.log("Email sent to: ", to);

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafafa; padding: 48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 0; overflow: hidden;">
          <tr>
            <td style="padding: 48px 32px 32px; text-align: center;">
              <p style="color: #737373; font-size: 12px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 16px 0;">GPT</p>
              <h1 style="color: #000000; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.5px;">Invitation to collaborate</h1>
              <p style="color: #525252; font-size: 15px; line-height: 1.6; margin: 16px 0 0 0;">
                Someone wants you to join their chat. Click the button below to open it.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 48px; text-align: center;">
              <a href="${link}" style="display: inline-block; padding: 14px 32px; background-color: #000000; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; border-radius: 0; border: 1px solid #000000;">
                ${name}
              </a>
              <p style="color: #a3a3a3; font-size: 12px; line-height: 1.5; margin: 24px 0 0 0;">
                If you did not expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #000000; padding: 24px 32px; text-align: center;">
              <p style="color: #ffffff; font-size: 12px; margin: 0;">The GPT Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  try {
    await smtp.transport.sendMail({
      from: smtp.email,
      to,
      subject,
      html: emailHtml,
    });
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

export async function sendPrReviewMail({
  to,
  owner,
  repo,
  prNumber,
  title,
  htmlUrl,
  summary,
  keyChanges,
  issuesFound,
  recommendations,
}) {
  const smtp = createTransport();
  if (!smtp) return false;

  await smtp.transport.verify();

  const subject = `PR review: ${owner}/${repo}#${prNumber} — ${title}`;
  const safeTitle = escapeHtml(title || "Untitled PR");
  const safeRepo = escapeHtml(`${owner}/${repo}`);
  const prLink = htmlUrl
    ? `<p style="margin: 0 0 24px 0;"><a href="${escapeHtml(htmlUrl)}" style="color: #000000;">View pull request</a></p>`
    : "";

  const sections = [
    { heading: "Summary", body: summary },
    { heading: "Key changes", body: keyChanges },
    { heading: "Issues found", body: issuesFound },
    { heading: "Recommendations", body: recommendations },
  ];

  const sectionsHtml = sections
    .map(
      ({ heading, body }) => `
            <h2 style="color: #000000; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">${escapeHtml(heading)}</h2>
            <pre style="margin: 0 0 28px 0; padding: 16px; background-color: #f5f5f5; border: 1px solid #e5e5e5; color: #171717; font-size: 13px; line-height: 1.55; white-space: pre-wrap; word-wrap: break-word; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${escapeHtml(body || "N/A")}</pre>`
    )
    .join("");

  const textBody = sections
    .map(({ heading, body }) => `${heading}\n${body || "N/A"}`)
    .join("\n\n");

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafafa; padding: 48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 640px; background-color: #ffffff; border: 1px solid #e5e5e5;">
          <tr>
            <td style="padding: 40px 32px 24px;">
              <p style="color: #737373; font-size: 12px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 16px 0;">GPT</p>
              <h1 style="color: #000000; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.5px;">AI pull request review</h1>
              <p style="color: #525252; font-size: 15px; line-height: 1.6; margin: 16px 0 0 0;">
                Review for <strong>${safeRepo}</strong> PR #${escapeHtml(String(prNumber))}: ${safeTitle}
              </p>
              ${prLink}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 40px;">
              ${sectionsHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color: #000000; padding: 24px 32px; text-align: center;">
              <p style="color: #ffffff; font-size: 12px; margin: 0;">The GPT Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  try {
    await smtp.transport.sendMail({
      from: smtp.email,
      to,
      subject,
      html: emailHtml,
      text: textBody,
    });
    return true;
  } catch (error) {
    console.error("Error sending PR review email:", error);
    return false;
  }
}

