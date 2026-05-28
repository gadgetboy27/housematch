// API endpoint for support contact form
import { Router } from 'express';
import { z } from 'zod';
import { EmailService } from '../services/email';

const router = Router();

const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address').max(200),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200),
  message: z.string().min(20, 'Message must be at least 20 characters').max(2000)
});

// POST /api/support/contact - Submit contact form
router.post('/contact', async (req, res) => {
  try {
    // Validate input
    const validation = contactFormSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message
      });
    }

    const { name, email, subject, message } = validation.data;

    // Send email to support
    const supportEmail = process.env.GMAIL_EMAIL || 'support@housematch.co.nz';
    
    await EmailService.queueEmail({
      recipientEmail: supportEmail,
      recipientName: 'HouseMatch Support',
      subject: `Support Request: ${subject}`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #4b5563; }
            .value { margin-top: 5px; padding: 10px; background: white; border-radius: 4px; border: 1px solid #e5e7eb; }
            .message-box { white-space: pre-wrap; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">🆘 New Support Request</h2>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">From:</div>
                <div class="value">${name}</div>
              </div>
              
              <div class="field">
                <div class="label">Email:</div>
                <div class="value"><a href="mailto:${email}">${email}</a></div>
              </div>
              
              <div class="field">
                <div class="label">Subject:</div>
                <div class="value">${subject}</div>
              </div>
              
              <div class="field">
                <div class="label">Message:</div>
                <div class="value message-box">${message}</div>
              </div>
              
              <div class="footer">
                <p><strong>Quick Reply:</strong> Reply directly to this email to respond to ${name}</p>
                <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">
                  Submitted via HouseMatch Support Form
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      textContent: `
NEW SUPPORT REQUEST

From: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
Reply to this email to respond to ${name} at ${email}
      `,
      notificationType: 'support_request'
    });

    // Send confirmation email to user
    await EmailService.queueEmail({
      recipientEmail: email,
      recipientName: name,
      subject: 'We received your message - HouseMatch Support',
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">✅ Message Received</h2>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              
              <p>Thanks for reaching out! We've received your message and will get back to you within <strong>24-48 hours</strong>.</p>
              
              <p><strong>Your message:</strong></p>
              <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #667eea; margin: 15px 0;">
                <strong>Subject:</strong> ${subject}<br>
                <div style="margin-top: 10px; white-space: pre-wrap;">${message}</div>
              </div>
              
              <p>If you have any additional information to add, feel free to reply to this email.</p>
              
              <div class="footer">
                <p><strong>HouseMatch Support Team</strong></p>
                <p>Email: ${supportEmail}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      textContent: `
Hi ${name},

Thanks for reaching out! We've received your message and will get back to you within 24-48 hours.

Your message:
Subject: ${subject}
${message}

If you have any additional information to add, feel free to reply to this email.

---
HouseMatch Support Team
${supportEmail}
      `,
      notificationType: 'support_confirmation'
    });

    console.log(`📧 Support request received from ${name} (${email})`);

    res.json({
      success: true,
      message: 'Your message has been sent successfully. We\'ll respond within 24-48 hours.'
    });

  } catch (error: any) {
    console.error('Error processing support request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message. Please try again or email us directly at support@housematch.co.nz'
    });
  }
});

export default router;
