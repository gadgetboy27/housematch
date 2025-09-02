import nodemailer from 'nodemailer';

export interface PasswordResetEmailParams {
  email: string;
  name: string;
  resetToken: string;
  resetUrl: string;
}

// Create Gmail SMTP transporter
function createGmailTransporter() {
  if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Gmail credentials not found. Please set GMAIL_EMAIL and GMAIL_APP_PASSWORD environment variables.");
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD, // This is an "App Password", not your regular Gmail password
    },
  });
}

// Send offer notification with PDF attachment to property seller
export async function sendOfferNotificationViaGmail(
  sellerEmail: string,
  offer: any,
  property: any,
  pdfBase64?: string
): Promise<boolean> {
  try {
    const transporter = createGmailTransporter();
    const subject = `🏠 New Offer Received - ${property.address}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🏠 New Property Offer</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">You've received an offer on your property</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Property Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Address:</td>
                <td style="padding: 8px 0;">${property.address}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Lot Number:</td>
                <td style="padding: 8px 0; font-family: monospace; background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">${offer.propertyLotNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Certificate of Title:</td>
                <td style="padding: 8px 0; font-family: monospace; background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">${offer.propertyCertificateOfTitle}</td>
              </tr>
              ${offer.propertyZoning ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Zoning:</td>
                <td style="padding: 8px 0;">${offer.propertyZoning}</td>
              </tr>
              ` : ''}
              ${offer.propertyLandArea ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Land Area:</td>
                <td style="padding: 8px 0;">${offer.propertyLandArea}m²</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Offer Details</h2>
            <div style="background: #e8f5e8; padding: 20px; border-radius: 6px; margin-bottom: 15px;">
              <div style="font-size: 32px; font-weight: bold; color: #2d5a3d; text-align: center;">
                ${offer.offerPrice}
              </div>
              <div style="text-align: center; color: #666; margin-top: 5px;">Offer Price</div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Settlement Period:</td>
                <td style="padding: 8px 0;">${offer.settlementPeriod}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Finance Condition:</td>
                <td style="padding: 8px 0;">${offer.financeCondition ? '✅ Yes' : '❌ No'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Building Inspection:</td>
                <td style="padding: 8px 0;">${offer.buildingInspectionCondition ? '✅ Yes' : '❌ No'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">LIM Report:</td>
                <td style="padding: 8px 0;">${offer.limCondition ? '✅ Yes' : '❌ No'}</td>
              </tr>
            </table>
          </div>

          <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Buyer Information</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Name:</td>
                <td style="padding: 8px 0;">${offer.buyerName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Email:</td>
                <td style="padding: 8px 0;"><a href="mailto:${offer.buyerEmail}" style="color: #667eea;">${offer.buyerEmail}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666;">Phone:</td>
                <td style="padding: 8px 0;"><a href="tel:${offer.buyerPhone}" style="color: #667eea;">${offer.buyerPhone}</a></td>
              </tr>
            </table>
          </div>

          ${offer.additionalConditions || offer.additionalComments ? `
          <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Additional Information</h2>
            ${offer.additionalConditions ? `
              <div style="margin-bottom: 15px;">
                <strong style="color: #666;">Conditions:</strong>
                <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin-top: 5px;">${offer.additionalConditions}</div>
              </div>
            ` : ''}
            ${offer.additionalComments ? `
              <div>
                <strong style="color: #666;">Comments:</strong>
                <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin-top: 5px;">${offer.additionalComments}</div>
              </div>
            ` : ''}
          </div>
          ` : ''}

          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #856404; margin-top: 0;">📄 Legal Documents Attached</h3>
            <p style="color: #856404; margin: 0;">This offer includes a PDF copy of the formal purchase agreement. Please review with your legal representative.</p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <div style="background: #667eea; color: white; padding: 15px; border-radius: 6px; display: inline-block;">
              <strong>Offer ID: ${offer.id}</strong><br>
              <small>Reference this ID in all communications</small>
            </div>
          </div>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; opacity: 0.7;">This offer was submitted through Cribsy Property Platform</p>
          <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.5;">Secure • Verified • Legally Compliant</p>
        </div>
      </div>
    `;

    const textContent = `
NEW PROPERTY OFFER RECEIVED

Property: ${property.address}
Lot Number: ${offer.propertyLotNumber}
Certificate of Title: ${offer.propertyCertificateOfTitle}

OFFER DETAILS:
- Price: ${offer.offerPrice}
- Settlement: ${offer.settlementPeriod}
- Finance Condition: ${offer.financeCondition ? 'Yes' : 'No'}
- Building Inspection: ${offer.buildingInspectionCondition ? 'Yes' : 'No'}
- LIM Report: ${offer.limCondition ? 'Yes' : 'No'}

BUYER INFORMATION:
- Name: ${offer.buyerName}
- Email: ${offer.buyerEmail}
- Phone: ${offer.buyerPhone}

${offer.additionalConditions ? `Additional Conditions: ${offer.additionalConditions}` : ''}
${offer.additionalComments ? `Comments: ${offer.additionalComments}` : ''}

Offer ID: ${offer.id}

A formal PDF document is attached for your legal review.
    `;

    const mailOptions: any = {
      from: `"Cribsy Property Platform" <${process.env.GMAIL_EMAIL}>`,
      to: sellerEmail,
      subject,
      text: textContent,
      html: htmlContent,
    };

    // Add PDF attachment if provided
    if (pdfBase64) {
      mailOptions.attachments = [{
        filename: `offer-${offer.id}.pdf`,
        content: pdfBase64,
        encoding: 'base64',
        contentType: 'application/pdf'
      }];
    }

    const result = await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    return false;
  }
}

export async function sendPasswordResetEmailViaGmail(params: PasswordResetEmailParams): Promise<boolean> {
  try {
    const { email, name, resetToken, resetUrl } = params;
    
    
    const transporter = createGmailTransporter();
    
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

    const mailOptions = {
      from: `"Property Swiping App" <${process.env.GMAIL_EMAIL}>`,
      to: email,
      subject: '🔐 Reset Your Password - Property Swiping App',
      text: textContent,
      html: htmlContent,
    };

    const result = await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    return false;
  }
}