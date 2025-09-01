import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

// Validate and fix SendGrid API key format
let apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey.startsWith('SG.')) {
  console.log(`🔧 API key doesn't start with 'SG.', attempting to add prefix...`);
  console.log(`Original key starts with: "${apiKey.slice(0, 3)}..."`);
  apiKey = 'SG.' + apiKey;
  console.log(`✅ Modified key now starts with: "${apiKey.slice(0, 6)}..."`);
} else {
  console.log("✅ Valid SendGrid API key format detected");
}

const mailService = new MailService();
mailService.setApiKey(apiKey);

export interface PasswordResetEmailParams {
  email: string;
  name: string;
  resetToken: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<boolean> {
  try {
    const { email, name, resetToken, resetUrl } = params;
    
    // HTML email template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background-color: #f9f9f9; padding: 30px; border-radius: 10px; }
            .header { text-align: center; color: #8B5CF6; margin-bottom: 30px; }
            .button { display: inline-block; background-color: #8B5CF6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .button:hover { background-color: #7C3AED; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            .warning { background-color: #fef3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #fbbf24; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="header">🔐 Reset Your Password</h1>
            
            <p>Hello ${name},</p>
            
            <p>We received a request to reset your password for your property swiping account. If you didn't make this request, you can safely ignore this email.</p>
            
            <div class="warning">
              <strong>⏰ Security Notice:</strong> This password reset link will expire in 1 hour for your security.
            </div>
            
            <p>To reset your password, click the button below:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset My Password</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f1f1f1; padding: 10px; border-radius: 3px;">${resetUrl}</p>
            
            <div class="footer">
              <p><strong>Security Tips:</strong></p>
              <ul>
                <li>Never share this link with anyone</li>
                <li>This link expires in 1 hour</li>
                <li>If you didn't request this reset, please contact support</li>
              </ul>
              
              <p>Best regards,<br>The Property Swiping Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Plain text version
    const textContent = `
Reset Your Password

Hello ${name},

We received a request to reset your password for your property swiping account. 

To reset your password, visit this link: ${resetUrl}

This link will expire in 1 hour for your security.

If you didn't make this request, you can safely ignore this email.

Best regards,
The Property Swiping Team
    `;

    await mailService.send({
      to: email,
      from: 'noreply@propertyswipe.com', // You should verify this domain in SendGrid
      subject: '🔐 Reset Your Password - Property Swiping App',
      text: textContent,
      html: htmlContent,
    });

    console.log(`✅ Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ SendGrid email error:', error);
    return false;
  }
}