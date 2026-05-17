import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "His Altar <Support@HisAltar.com>";
const SUPPORT = "Support@HisAltar.com";

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
