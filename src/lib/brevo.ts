export async function sendOtpEmail({
  toEmail,
  otpCode,
}: {
  toEmail: string;
  otpCode: string;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!apiKey || !senderEmail) {
    throw new Error('BREVO_API_KEY or BREVO_SENDER_EMAIL environment variable is not configured.');
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FFF8F2;">
        <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border: 2px solid #111111; border-radius: 24px; padding: 32px 24px; box-shadow: 0 4px 0 #111111; text-align: center;">
          <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; background-color: #FF3B30; color: #ffffff; border: 2px solid #111111; border-radius: 18px; font-size: 28px; margin-bottom: 16px;">
            🍜
          </div>
          <h1 style="color: #111111; font-size: 22px; font-weight: 900; margin: 0 0 4px 0; letter-spacing: -0.02em;">
            Newtown Express
          </h1>
          <p style="color: #6B6B6B; font-size: 13px; font-weight: 700; margin: 0 0 24px 0;">
            Pantry One-Time Login Code
          </p>

          <div style="background-color: #FFF8F2; border: 2px solid #111111; border-radius: 18px; padding: 24px 16px; margin-bottom: 24px; box-shadow: 0 3px 0 #111111;">
            <p style="color: #6B6B6B; font-size: 11px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.08em;">
              Your 6-Digit Passcode
            </p>
            <div style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #FF3B30; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; line-height: 1.2;">
              ${otpCode}
            </div>
            <p style="color: #6B6B6B; font-size: 12px; font-weight: 700; margin: 12px 0 0 0;">
              Valid for 5 minutes
            </p>
          </div>

          <p style="color: #6B6B6B; font-size: 12px; font-weight: 600; line-height: 1.5; margin: 0;">
            If you did not request this login code, you can safely ignore this email.
          </p>
        </div>
      </body>
    </html>
  `;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: 'Newtown Express',
        email: senderEmail,
      },
      to: [
        {
          email: toEmail,
        },
      ],
      subject: `${otpCode} is your Newtown Express login code`,
      htmlContent: emailHtml,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    console.error('[BREVO_API_ERROR]', res.status, errorBody);
    throw new Error((errorBody as { message?: string }).message || `Brevo email API returned status ${res.status}`);
  }

  return await res.json();
}
