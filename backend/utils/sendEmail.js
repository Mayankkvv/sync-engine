const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

async function sendResetEmail(to, resetLink) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Reset your Sync Engine password",
    html: `
      <p>Someone requested a password reset for this account.</p>
      <p><a href="${resetLink}">Click here to set a new password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}

module.exports = sendResetEmail;