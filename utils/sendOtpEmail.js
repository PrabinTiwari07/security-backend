require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS);

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendOtpEmail = async ({ email, name, otp, type = "verify", daysUntilExpiry }) => {
  let subject, html;

  switch (type) {
    case "password-expiry-reminder":
      subject = "MeroYatra - Password Expiry Reminder";
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="text-align: center; color: #e74c3c;">🚗 MeroYatra - Password Expiry Warning</h2>
          <p>Hi <strong>${name || 'User'}</strong>,</p>
          <p>Your password will expire in <strong>${daysUntilExpiry} day(s)</strong>.</p>
          <p>Please log in to your account and change your password to avoid being locked out.</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="http://localhost:5173/change-password" style="background-color: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Change Password</a>
          </div>
          <p style="color: #999; font-size: 12px;">— The MeroYatra Team</p>
        </div>
      `;
      break;

    case "password-expired":
      subject = "MeroYatra - Password Expired";
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="text-align: center; color: #e74c3c;">🚗 MeroYatra - Password Expired</h2>
          <p>Hi <strong>${name || 'User'}</strong>,</p>
          <p>Your password has expired. You must change your password before you can log in again.</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="http://localhost:5173/forgot-password" style="background-color: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          </div>
          <p style="color: #999; font-size: 12px;">— The MeroYatra Team</p>
        </div>
      `;
      break;

    case "reset":
      subject = "MeroYatra - Password Reset OTP";
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="text-align: center; color: #2c3e50;">🚗 MeroYatra - Password Reset</h2>
          <p>Hi <strong>${name || 'User'}</strong>,</p>
          <p>Please use the following OTP to reset your password:</p>
          <h1 style="text-align: center; background-color: #f1f1f1; padding: 15px; border-radius: 8px; letter-spacing: 5px;">${otp}</h1>
          <p style="margin-top: 20px;">If you did not request this, you can safely ignore this email.</p>
          <p style="color: #999; font-size: 12px;">— The MeroYatra Team</p>
        </div>
      `;
      break;

    default:
      subject = type === "resend" ? "MeroYatra - Resend OTP" : "MeroYatra - OTP Verification";
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="text-align: center; color: #2c3e50;">🚗 MeroYatra - OTP Verification</h2>
          <p>Hi <strong>${name || 'User'}</strong>,</p>
          <p>Please use the following OTP to ${type === "resend" ? "verify your account again" : "complete your registration"}:</p>
          <h1 style="text-align: center; background-color: #f1f1f1; padding: 15px; border-radius: 8px; letter-spacing: 5px;">${otp}</h1>
          <p style="margin-top: 20px;">If you did not request this, you can safely ignore this email.</p>
          <p style="color: #999; font-size: 12px;">— The MeroYatra Team</p>
        </div>
      `;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    html
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendOtpEmail;
