"use server";
import nodemailer from "nodemailer";

export async function sendMail({ to, name, subject, link }) {
    const { SMTP_EMAIL, SMTP_PASSWORD } = process.env;

    if (!SMTP_EMAIL || !SMTP_PASSWORD) {
        console.error("SMTP credentials are missing");
        return;
    }

    const transport = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: SMTP_EMAIL,
            pass: SMTP_PASSWORD,
        },
    });

    await transport.verify();


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
              <p style="color: #737373; font-size: 12px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 16px 0;">SNIPPETS</p>
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
              <p style="color: #ffffff; font-size: 12px; margin: 0;">The SNIPPETS Team</p>
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
        const sendResult = await transport.sendMail({
            from: SMTP_EMAIL,
            to,
            subject,
            html: emailHtml,
        });
        // console.log("Email sent successfully:", sendResult);

        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
}