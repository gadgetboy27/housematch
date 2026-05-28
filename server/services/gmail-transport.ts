import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Gmail configuration from environment variables
const GMAIL_EMAIL = process.env.GMAIL_EMAIL;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

// Default sender configuration
const FROM_EMAIL = GMAIL_EMAIL || 'notifications@swiperight.nz';
const FROM_NAME = 'HouseMatch NZ';

// Cached transporter instance
let cachedTransporter: Transporter | null = null;

/**
 * Create and return Gmail SMTP transporter (singleton pattern for efficiency)
 */
export function getGmailTransporter(): Transporter {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  if (!GMAIL_EMAIL || !GMAIL_APP_PASSWORD) {
    console.error('⚠️ Gmail credentials not configured - GMAIL_EMAIL or GMAIL_APP_PASSWORD missing');
    throw new Error('Email service unavailable - Gmail credentials not configured');
  }

  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_EMAIL,
      pass: GMAIL_APP_PASSWORD, // This is an "App Password", not your regular Gmail password
    },
  });

  console.log(`✅ Gmail transporter initialized with ${GMAIL_EMAIL}`);
  return cachedTransporter;
}

/**
 * Check if Gmail is configured and ready to send emails
 */
export function isGmailConfigured(): boolean {
  return !!(GMAIL_EMAIL && GMAIL_APP_PASSWORD);
}

/**
 * Get the configured FROM email address
 */
export function getFromEmail(): string {
  return FROM_EMAIL;
}

/**
 * Get the configured FROM name
 */
export function getFromName(): string {
  return FROM_NAME;
}

/**
 * Send a single email via Gmail
 */
export async function sendGmailEmail(options: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  fromName?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!isGmailConfigured()) {
      console.warn('⚠️ Gmail not configured - email not sent');
      return {
        success: false,
        error: 'Gmail credentials not configured',
      };
    }

    const transporter = getGmailTransporter();
    
    const mailOptions = {
      from: options.fromName 
        ? `"${options.fromName}" <${options.from || FROM_EMAIL}>`
        : options.from || FROM_EMAIL,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
    };

    const result = await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent via Gmail to ${mailOptions.to} - MessageID: ${result.messageId}`);

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error: any) {
    console.error('❌ Failed to send email via Gmail:', error.message);
    return {
      success: false,
      error: error.message || 'Unknown email error',
    };
  }
}

/**
 * Send service inquiry notification email to admin
 */
export async function sendServiceInquiryEmail(inquiry: any) {
  const serviceNames: Record<string, string> = {
    moving: 'Moving Services',
    home_staging: 'Home Staging',
    cleaning: 'End of Tenancy Cleaning',
    hosting: 'Hosting & Key Holding'
  };

  const html = `
    <h2>New Service Inquiry Received</h2>
    <p><strong>Service:</strong> ${serviceNames[inquiry.serviceType] || inquiry.serviceName}</p>
    <p><strong>Customer Name:</strong> ${inquiry.customerName}</p>
    <p><strong>Email:</strong> ${inquiry.customerEmail}</p>
    <p><strong>Phone:</strong> ${inquiry.customerPhone || 'Not provided'}</p>
    ${inquiry.propertyAddress ? `<p><strong>Property:</strong> ${inquiry.propertyAddress}</p>` : ''}
    ${inquiry.message ? `<p><strong>Message:</strong><br/>${inquiry.message}</p>` : ''}
    <p><em>Received at: ${new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' })}</em></p>
  `;

  return await sendGmailEmail({
    to: 'admin@swiperight.nz',
    subject: `New ${serviceNames[inquiry.serviceType]} Inquiry - ${inquiry.customerName}`,
    html,
  });
}

/**
 * Export default sender configuration
 */
export const gmailConfig = {
  fromEmail: FROM_EMAIL,
  fromName: FROM_NAME,
  isConfigured: isGmailConfigured,
};
