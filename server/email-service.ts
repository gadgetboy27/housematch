import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    content: string; // base64 encoded content
    filename: string;
    type: string;
    disposition: string;
  }>;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text || undefined,
      html: params.html || undefined,
      attachments: params.attachments,
    });
    return true;
  } catch (error) {
    return false;
  }
}

// Send offer notification to property seller
export async function sendOfferNotificationToSeller(
  sellerEmail: string,
  offer: any,
  property: any,
  pdfBase64?: string
): Promise<boolean> {
  const fromEmail = process.env.GMAIL_EMAIL || 'noreply@cribsyapp.com';
  
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

  const attachments = pdfBase64 ? [{
    content: pdfBase64,
    filename: `offer-${offer.id}.pdf`,
    type: 'application/pdf',
    disposition: 'attachment'
  }] : undefined;

  return await sendEmail({
    to: sellerEmail,
    from: fromEmail,
    subject,
    html: htmlContent,
    text: textContent,
    attachments,
  });
}