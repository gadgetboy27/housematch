import { randomBytes } from 'crypto';
import { sendGmailEmail, isGmailConfigured, gmailConfig } from './services/gmail-transport';

// Check Gmail configuration
if (!isGmailConfigured()) {
  console.warn('⚠️ Gmail not configured - email verification will fail in production');
}

export interface EmailVerificationParams {
  email: string;
  name: string;
  verificationToken: string;
  verificationUrl: string;
}

export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

export function getVerificationExpiry(): Date {
  // Token expires in 24 hours
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry;
}

// Email rate limiting to prevent email bombing
const emailSendHistory = new Map<string, number>();
const EMAIL_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_EMAILS_PER_WINDOW = 1; // Max 1 verification email per minute per address

function checkEmailRateLimit(email: string): boolean {
  const now = Date.now();
  const lastSent = emailSendHistory.get(email);
  
  if (lastSent && (now - lastSent) < EMAIL_RATE_LIMIT_WINDOW_MS) {
    return false; // Rate limit exceeded
  }
  
  emailSendHistory.set(email, now);
  
  // Cleanup old entries (keep map size bounded)
  if (emailSendHistory.size > 10000) {
    const cutoff = now - EMAIL_RATE_LIMIT_WINDOW_MS;
    for (const [key, timestamp] of emailSendHistory.entries()) {
      if (timestamp < cutoff) {
        emailSendHistory.delete(key);
      }
    }
  }
  
  return true; // Rate limit OK
}

export async function sendVerificationEmail(params: EmailVerificationParams): Promise<boolean> {
  try {
    const { email, name, verificationToken, verificationUrl } = params;
    
    // SECURITY: Rate limit check to prevent email bombing
    if (!checkEmailRateLimit(email)) {
      console.warn(`Email rate limit exceeded for: ${email}`);
      throw new Error('Too many verification emails sent. Please wait before requesting another.');
    }

    const textContent = `
Hi ${name},

Welcome to HouseMatch.nz! 

Please verify your email address to start swiping through amazing NZ properties.

Click this link to verify: ${verificationUrl}

This link expires in 24 hours.

If you didn't create this account, please ignore this email.

Cheers,
The HouseMatch.nz Team
    `;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ Verify Your Email</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Welcome to HouseMatch.nz!</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Hi <strong>${name}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Thanks for signing up! We're excited to have you discover amazing properties across New Zealand.
              </p>
              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                To get started, please verify your email address by clicking the button below:
              </p>
              
              <!-- Verification Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${verificationUrl}" 
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                              color: #ffffff; 
                              padding: 16px 40px; 
                              text-decoration: none; 
                              border-radius: 8px; 
                              font-size: 18px; 
                              font-weight: bold; 
                              display: inline-block;
                              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                      Verify My Email
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Security Notice -->
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 30px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                  <strong>⏰ Important:</strong> This verification link expires in 24 hours for your security.
                </p>
              </div>
              
              <!-- Alternative Link -->
              <p style="margin: 20px 0 10px 0; font-size: 14px; color: #666666;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 30px 0; padding: 12px; background-color: #f8f9fa; border-radius: 4px; word-break: break-all; font-size: 12px; color: #667eea;">
                ${verificationUrl}
              </p>
              
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #666666;">
                If you didn't create an account with HouseMatch.nz, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-radius: 0 0 10px 10px;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
                Need help? Contact us at info@swiperight.nz
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999;">
                © 2025 HouseMatch.nz - New Zealand Property Discovery Platform
              </p>
              <p style="margin: 10px 0 0 0; font-size: 11px; color: #999999;">
                🔒 Secure • 🇳🇿 Kiwi Made • ✨ Swipe Smart
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const result = await sendGmailEmail({
      to: email,
      subject: '✅ Verify Your HouseMatch.nz Email Address',
      text: textContent,
      html: htmlContent,
      fromName: gmailConfig.fromName,
    });

    if (!result.success) {
      console.error('❌ Failed to send verification email:', result.error);
      return false;
    }

    console.log('✅ Verification email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    return false;
  }
}

export async function sendVerificationReminderEmail(email: string, name: string, verificationUrl: string): Promise<boolean> {
  try {
    const textContent = `
Hi ${name},

You're almost there! Just one more step to unlock your HouseMatch.nz account.

Verify your email: ${verificationUrl}

This link expires soon, so verify now to start discovering properties!

Cheers,
The HouseMatch.nz Team
    `;

    const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0;">⏰ Don't Miss Out!</h1>
  </div>
  <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your HouseMatch.nz account is ready to go – you just need to verify your email!</p>
    <div style="text-align: center; padding: 20px 0;">
      <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">Verify Now</a>
    </div>
    <p style="font-size: 14px; color: #666;">Link: ${verificationUrl}</p>
  </div>
</body>
</html>
    `;

    const result = await sendGmailEmail({
      to: email,
      subject: '⏰ Reminder: Verify Your HouseMatch.nz Email',
      text: textContent,
      html: htmlContent,
      fromName: gmailConfig.fromName,
    });

    if (!result.success) {
      console.error('Failed to send reminder email:', result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send reminder email:', error);
    return false;
  }
}
