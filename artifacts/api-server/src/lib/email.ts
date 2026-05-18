import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "His Altar <Support@HisAltar.com>";
const SUPPORT = "Support@HisAltar.com";

export async function sendBroadcastEmail(opts: { toEmail: string; orgName: string; subject: string; body: string }) {
  await resend.emails.send({
    from: FROM,
    to: opts.toEmail,
    subject: opts.subject,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0c0b;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0c0b;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#131210;border:1px solid #3a2e1e;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#2a1f0e,#1a1408);padding:28px 40px;text-align:center;border-bottom:1px solid #3a2e1e;">
            <p style="margin:0 0 4px;color:#c8a060;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;">His Altar</p>
            <h1 style="margin:0;color:#e8c882;font-size:20px;letter-spacing:0.1em;font-weight:normal;">${opts.subject}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 12px;color:#c8a870;font-size:14px;">Hi ${opts.orgName},</p>
            <div style="color:#a08850;font-size:14px;line-height:1.8;white-space:pre-wrap;">${opts.body.replace(/\n/g, "<br>")}</div>
            <p style="margin:28px 0 0;color:#5a4a30;font-size:12px;">— The His Altar Team</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px;border-top:1px solid #2a2218;text-align:center;">
            <p style="margin:0;color:#5a4a30;font-size:11px;">His Altar · <a href="mailto:${SUPPORT}" style="color:#5a4a30;text-decoration:none;">${SUPPORT}</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
  });
}

export async function sendPasscodeEmail(opts: { toEmail: string; orgName: string; passcode: string }) {
  await resend.emails.send({
    from: FROM,
    to: opts.toEmail,
    subject: "His Altar — Your Admin Passcode",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0c0b;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0c0b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#131210;border:1px solid #3a2e1e;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#2a1f0e,#1a1408);padding:36px 40px;text-align:center;border-bottom:1px solid #3a2e1e;">
              <p style="margin:0 0 6px;color:#c8a060;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;">His Altar</p>
              <h1 style="margin:0;color:#e8c882;font-size:22px;letter-spacing:0.1em;text-transform:uppercase;font-weight:normal;">Your Admin Passcode</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 18px;color:#c8a870;font-size:15px;line-height:1.7;">Hi ${opts.orgName},</p>
              <p style="margin:0 0 24px;color:#a08850;font-size:14px;line-height:1.8;">
                Here is your current admin passcode:
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background:#1a1810;border:2px solid #c8a060;border-radius:10px;padding:18px 40px;text-align:center;">
                    <span style="font-family:monospace;font-size:28px;font-weight:700;color:#e8c882;letter-spacing:0.15em;">${opts.passcode}</span>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;color:#a08850;font-size:13px;line-height:1.8;">
                Use this code to access the admin section of your portal. You can change it any time from Admin Settings.
              </p>
              <p style="margin:24px 0 0;color:#5a4a30;font-size:12px;line-height:1.7;">
                If you didn't request this, someone may have entered your email address. You can safely ignore this message.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #2a2218;text-align:center;">
              <p style="margin:0;color:#5a4a30;font-size:11px;letter-spacing:0.1em;">
                His Altar · <a href="mailto:${SUPPORT}" style="color:#5a4a30;text-decoration:none;">${SUPPORT}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });
}

export async function sendPasswordResetEmail(opts: { toEmail: string; orgName: string; resetUrl: string }) {
  await resend.emails.send({
    from: FROM,
    to: opts.toEmail,
    subject: "His Altar — Password Reset",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0c0b;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0c0b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#131210;border:1px solid #3a2e1e;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#2a1f0e,#1a1408);padding:36px 40px;text-align:center;border-bottom:1px solid #3a2e1e;">
              <p style="margin:0 0 6px;color:#c8a060;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;">His Altar</p>
              <h1 style="margin:0;color:#e8c882;font-size:22px;letter-spacing:0.1em;text-transform:uppercase;font-weight:normal;">Password Reset</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 18px;color:#c8a870;font-size:15px;line-height:1.7;">Hi ${opts.orgName},</p>
              <p style="margin:0 0 24px;color:#a08850;font-size:14px;line-height:1.8;">
                We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background:#7c3aed;border-radius:8px;text-align:center;">
                    <a href="${opts.resetUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.05em;">Reset My Password</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;color:#a08850;font-size:13px;line-height:1.8;">
                If the button doesn't work, copy and paste this link:<br>
                <a href="${opts.resetUrl}" style="color:#c8a060;word-break:break-all;">${opts.resetUrl}</a>
              </p>
              <p style="margin:24px 0 0;color:#5a4a30;font-size:12px;line-height:1.7;">
                If you didn't request this, you can safely ignore this email. Your password won't change.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #2a2218;text-align:center;">
              <p style="margin:0;color:#5a4a30;font-size:11px;letter-spacing:0.1em;">
                His Altar · <a href="mailto:${SUPPORT}" style="color:#5a4a30;text-decoration:none;">${SUPPORT}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });
}

export async function sendWelcomeEmail(opts: {
  toEmail: string;
  orgName: string;
  contactName?: string | null;
}) {
  const name = opts.contactName || opts.orgName;
  await resend.emails.send({
    from: FROM,
    to: opts.toEmail,
    subject: `Welcome to His Altar — ${opts.orgName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0c0b;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0c0b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#131210;border:1px solid #3a2e1e;border-radius:12px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2a1f0e,#1a1408);padding:36px 40px;text-align:center;border-bottom:1px solid #3a2e1e;">
              <p style="margin:0 0 6px;color:#c8a060;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;">His Altar</p>
              <h1 style="margin:0;color:#e8c882;font-size:26px;letter-spacing:0.15em;text-transform:uppercase;font-weight:normal;">Welcome</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 18px;color:#c8a870;font-size:15px;line-height:1.7;">
                Dear ${name},
              </p>
              <p style="margin:0 0 18px;color:#a08850;font-size:14px;line-height:1.8;">
                <strong style="color:#c8a870;">${opts.orgName}</strong> is now registered on His Altar. Your 30-day free trial has begun — no card required until the trial ends.
              </p>
              <p style="margin:0 0 24px;color:#a08850;font-size:14px;line-height:1.8;">
                Use your church dashboard to complete setup, add your team, and configure your tools — Altar Reports, Roster Check-In, Dbanc, and the PXP prayer follow-up system are all ready for you.
              </p>

              <!-- What's included -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1810;border:1px solid #3a2e1e;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;color:#c8a060;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;">What's Included</p>
                    <ul style="margin:0;padding:0 0 0 16px;color:#a08850;font-size:13px;line-height:2;">
                      <li>Altar Report — log and export altar responses</li>
                      <li>Roster &amp; Check-In — manage your altar team</li>
                      <li>Dbanc — prayer contact database</li>
                      <li>PXP — prayer follow-up call system</li>
                      <li>Multi-campus support</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;color:#a08850;font-size:14px;line-height:1.8;">
                If you have any questions, reply to this email or reach us at
                <a href="mailto:${SUPPORT}" style="color:#c8a060;text-decoration:none;">${SUPPORT}</a>.
              </p>
              <p style="margin:0;color:#a08850;font-size:14px;line-height:1.8;">
                Blessings,<br>
                <span style="color:#c8a870;">The His Altar Team</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #2a2218;text-align:center;">
              <p style="margin:0;color:#5a4a30;font-size:11px;letter-spacing:0.1em;">
                His Altar · <a href="mailto:${SUPPORT}" style="color:#5a4a30;text-decoration:none;">${SUPPORT}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });
}
