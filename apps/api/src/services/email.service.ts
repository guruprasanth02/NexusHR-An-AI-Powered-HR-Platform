import nodemailer from 'nodemailer';

const createTransport = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    // Mock transport — logs to console
    return nodemailer.createTransport({ jsonTransport: true });
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const transporter = createTransport();

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Inter', Arial, sans-serif; background: #0f0f1a; color: #e2e8f0; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(99,102,241,0.2); }
    .logo { font-size: 24px; font-weight: 800; background: linear-gradient(135deg, #6366f1, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 32px; }
    .btn { display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #6366f1, #a855f7); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 24px 0; }
    .footer { color: #64748b; font-size: 12px; margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); }
    h1 { color: #f8fafc; font-size: 28px; margin: 0 0 16px; }
    p { color: #94a3b8; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">⚡ NexusHR</div>
    ${content}
    <div class="footer">© 2024 NexusHR. All rights reserved.</div>
  </div>
</body>
</html>
`;

export const sendVerificationEmail = async (email: string, name: string, token: string) => {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  const html = baseTemplate(`
    <h1>Welcome to NexusHR! 👋</h1>
    <p>Hi ${name}, thanks for signing up. Please verify your email to get started.</p>
    <a href="${url}" class="btn">Verify Email</a>
    <p>This link expires in 24 hours.</p>
  `);

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"NexusHR" <noreply@nexushr.com>',
    to: email,
    subject: 'Verify your NexusHR account',
    html,
  });

  if (!process.env.SMTP_USER) {
    console.log(`[Email Mock] Verification link for ${email}: ${url}`);
  }

  return info;
};

export const sendPasswordResetEmail = async (email: string, name: string, token: string) => {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  const html = baseTemplate(`
    <h1>Reset your password 🔐</h1>
    <p>Hi ${name}, we received a password reset request.</p>
    <a href="${url}" class="btn">Reset Password</a>
    <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
  `);

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"NexusHR" <noreply@nexushr.com>',
    to: email,
    subject: 'Reset your NexusHR password',
    html,
  });

  if (!process.env.SMTP_USER) {
    console.log(`[Email Mock] Reset link for ${email}: ${url}`);
  }

  return info;
};

export const sendLeaveStatusEmail = async (
  email: string,
  name: string,
  status: 'APPROVED' | 'REJECTED',
  leaveType: string,
  dates: string,
  reason?: string
) => {
  const emoji = status === 'APPROVED' ? '✅' : '❌';
  const html = baseTemplate(`
    <h1>Leave ${status === 'APPROVED' ? 'Approved' : 'Rejected'} ${emoji}</h1>
    <p>Hi ${name}, your ${leaveType} leave request for <strong>${dates}</strong> has been ${status.toLowerCase()}.</p>
    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
    <p>Log in to NexusHR to view details.</p>
  `);

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"NexusHR" <noreply@nexushr.com>',
    to: email,
    subject: `Leave ${status === 'APPROVED' ? 'Approved' : 'Rejected'} — NexusHR`,
    html,
  });
};
