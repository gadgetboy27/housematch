import { sendGmailEmail, isGmailConfigured, gmailConfig } from './gmail-transport';

// Check Gmail configuration
if (!isGmailConfigured()) {
  console.error('⚠️  Gmail not configured - offer email notifications disabled');
}

interface OfferEmailData {
  offerType: 'express_interest' | 'make_offer';
  offerData: any;
  propertyData: any;
  buyerEmail: string;
  sellerEmail: string;
  pdfBuffer: Buffer;
  offerId: string;
}

/**
 * Validate email address format
 */
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Send PDF copies of offer forms to both buyer and seller
 */
export async function sendOfferEmails(data: OfferEmailData): Promise<{
  buyerEmailSent: boolean;
  sellerEmailSent: boolean;
  error?: string;
  validationErrors?: string[];
}> {
  const validationErrors: string[] = [];

  // Validate Gmail configuration
  if (!isGmailConfigured()) {
    return {
      buyerEmailSent: false,
      sellerEmailSent: false,
      error: 'Gmail not configured - emails cannot be sent. Please contact support.',
      validationErrors: ['Gmail credentials missing']
    };
  }

  const { offerType, offerData, propertyData, buyerEmail, sellerEmail, pdfBuffer, offerId } = data;

  // Validate buyer email
  if (!isValidEmail(buyerEmail)) {
    validationErrors.push(`Invalid buyer email address: ${buyerEmail || 'not provided'}`);
  }

  // Validate seller email
  if (!isValidEmail(sellerEmail)) {
    validationErrors.push(`Invalid seller email address: ${sellerEmail || 'not provided'}`);
  }

  // If validation failed, return early with detailed errors
  if (validationErrors.length > 0) {
    console.error('❌ Email validation failed:', validationErrors);
    return {
      buyerEmailSent: false,
      sellerEmailSent: false,
      error: 'Invalid email address(es) provided. Please check buyer and seller contact information.',
      validationErrors
    };
  }
  
  const isExpressInterest = offerType === 'express_interest';
  const offerTypeName = isExpressInterest ? 'Express Interest' : 'Official Offer (ADLS-Compliant)';
  
  // Track individual email success
  let buyerEmailSent = false;
  let sellerEmailSent = false;
  const errors: string[] = [];
  
  try {
    // Send buyer email
    try {
      const buyerResult = await sendGmailEmail({
        to: buyerEmail,
        subject: `${offerTypeName} Submitted - ${propertyData.address}`,
        html: generateBuyerEmailHTML({
          offerType,
          offerData,
          propertyData,
          offerId
        }),
        attachments: [
          {
            filename: `${isExpressInterest ? 'express-interest' : 'official-offer'}-${offerId}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          }
        ],
        fromName: gmailConfig.fromName,
      });

      if (buyerResult.success) {
        buyerEmailSent = true;
        console.log(`✅ Buyer confirmation email sent to ${buyerEmail}`);
      } else {
        const errorMsg = `Failed to send buyer email to ${buyerEmail}: ${buyerResult.error}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = `Failed to send buyer email to ${buyerEmail}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }

    // Send seller email
    try {
      const sellerResult = await sendGmailEmail({
        to: sellerEmail,
        subject: `New ${offerTypeName} Received - ${propertyData.address}`,
        html: generateSellerEmailHTML({
          offerType,
          offerData,
          propertyData,
          offerId
        }),
        attachments: [
          {
            filename: `${isExpressInterest ? 'express-interest' : 'official-offer'}-${offerId}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          }
        ],
        fromName: gmailConfig.fromName,
      });

      if (sellerResult.success) {
        sellerEmailSent = true;
        console.log(`✅ Seller notification email sent to ${sellerEmail}`);
      } else {
        const errorMsg = `Failed to send seller email to ${sellerEmail}: ${sellerResult.error}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = `Failed to send seller email to ${sellerEmail}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }

    // Log overall status
    if (buyerEmailSent && sellerEmailSent) {
      console.log(`✅ All offer emails sent successfully for offer ${offerId}`);
    } else {
      console.warn(`⚠️  Partial email delivery for offer ${offerId} - Buyer: ${buyerEmailSent}, Seller: ${sellerEmailSent}`);
    }

    return {
      buyerEmailSent,
      sellerEmailSent,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      validationErrors: errors.length > 0 ? errors : undefined
    };

  } catch (error: any) {
    console.error('❌ Unexpected error sending offer emails:', error.response?.body || error.message);
    return {
      buyerEmailSent: false,
      sellerEmailSent: false,
      error: `Email delivery failed: ${error.message}`,
      validationErrors: [error.message]
    };
  }
}

/**
 * Generate HTML email for buyer confirmation
 */
function generateBuyerEmailHTML(data: {
  offerType: string;
  offerData: any;
  propertyData: any;
  offerId: string;
}): string {
  const { offerType, offerData, propertyData, offerId } = data;
  const isExpressInterest = offerType === 'express_interest';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .section { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .section h3 { color: #667eea; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        .info-row { display: flex; margin-bottom: 10px; }
        .info-label { font-weight: bold; width: 150px; color: #666; }
        .info-value { flex: 1; color: #333; }
        .highlight { background: #e8f4f8; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>✅ ${isExpressInterest ? 'Express Interest' : 'Official Offer'} Submitted</h1>
        <p>Thank you for your interest in this property!</p>
      </div>
      
      <div class="content">
        <div class="section">
          <h3>📍 Property Details</h3>
          <div class="info-row">
            <div class="info-label">Address:</div>
            <div class="info-value"><strong>${propertyData.address}</strong></div>
          </div>
          <div class="info-row">
            <div class="info-label">Suburb:</div>
            <div class="info-value">${propertyData.suburb}</div>
          </div>
          ${propertyData.lotNumber ? `
          <div class="info-row">
            <div class="info-label">Lot Number:</div>
            <div class="info-value">${propertyData.lotNumber}</div>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <h3>💰 Your Offer</h3>
          <div class="highlight">
            <div class="info-row">
              <div class="info-label">Offer Price:</div>
              <div class="info-value"><strong>$${offerData.offerPrice}</strong></div>
            </div>
          </div>
          ${offerData.depositAmount ? `
          <div class="info-row">
            <div class="info-label">Deposit Amount:</div>
            <div class="info-value">$${offerData.depositAmount}</div>
          </div>
          ` : ''}
          ${offerData.settlementDate ? `
          <div class="info-row">
            <div class="info-label">Settlement Date:</div>
            <div class="info-value">${new Date(offerData.settlementDate).toLocaleDateString()}</div>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <h3>📋 Next Steps</h3>
          <p><strong>1. Seller Review:</strong> The property owner will review your ${isExpressInterest ? 'expression of interest' : 'official offer'} and respond soon.</p>
          <p><strong>2. Keep Your PDF:</strong> A copy of your ${isExpressInterest ? 'interest form' : 'ADLS-compliant offer'} is attached to this email for your records.</p>
          <p><strong>3. Track Status:</strong> You can view this offer and its status in your HouseMatch profile.</p>
          ${!isExpressInterest ? `<p><strong>4. Legal Advice:</strong> This is a legally binding offer. Please consult with your solicitor if you have any questions.</p>` : ''}
        </div>

        <div class="section">
          <h3>📄 Document Reference</h3>
          <div class="info-row">
            <div class="info-label">Offer ID:</div>
            <div class="info-value"><code>${offerId}</code></div>
          </div>
          <div class="info-row">
            <div class="info-label">Submitted:</div>
            <div class="info-value">${new Date().toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p><strong>HouseMatch Property Platform</strong></p>
        <p>Discover your dream property with confidence</p>
        <p>This is an automated notification. Please do not reply to this email.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML email for seller notification
 */
function generateSellerEmailHTML(data: {
  offerType: string;
  offerData: any;
  propertyData: any;
  offerId: string;
}): string {
  const { offerType, offerData, propertyData, offerId } = data;
  const isExpressInterest = offerType === 'express_interest';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .section { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .section h3 { color: #11998e; margin-top: 0; border-bottom: 2px solid #11998e; padding-bottom: 10px; }
        .info-row { display: flex; margin-bottom: 10px; }
        .info-label { font-weight: bold; width: 150px; color: #666; }
        .info-value { flex: 1; color: #333; }
        .highlight { background: #e8f8f5; padding: 15px; border-left: 4px solid #11998e; margin: 15px 0; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
        .button { display: inline-block; background: #11998e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 New ${isExpressInterest ? 'Expression of Interest' : 'Official Offer'} Received!</h1>
        <p>A buyer is interested in your property</p>
      </div>
      
      <div class="content">
        <div class="section">
          <h3>📍 Your Property</h3>
          <div class="info-row">
            <div class="info-label">Address:</div>
            <div class="info-value"><strong>${propertyData.address}</strong></div>
          </div>
          <div class="info-row">
            <div class="info-label">Suburb:</div>
            <div class="info-value">${propertyData.suburb}</div>
          </div>
          ${propertyData.lotNumber ? `
          <div class="info-row">
            <div class="info-label">Lot Number:</div>
            <div class="info-value">${propertyData.lotNumber}</div>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <h3>💰 Buyer's Offer</h3>
          <div class="highlight">
            <div class="info-row">
              <div class="info-label">Offer Price:</div>
              <div class="info-value"><strong>$${offerData.offerPrice}</strong></div>
            </div>
          </div>
          ${offerData.depositAmount ? `
          <div class="info-row">
            <div class="info-label">Deposit Amount:</div>
            <div class="info-value">$${offerData.depositAmount}</div>
          </div>
          ` : ''}
          ${offerData.settlementDate ? `
          <div class="info-row">
            <div class="info-label">Settlement Date:</div>
            <div class="info-value">${new Date(offerData.settlementDate).toLocaleDateString()}</div>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <h3>👤 Buyer Information</h3>
          <div class="info-row">
            <div class="info-label">Name:</div>
            <div class="info-value">${offerData.buyerName}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Email:</div>
            <div class="info-value">${offerData.buyerEmail}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Phone:</div>
            <div class="info-value">${offerData.buyerPhone}</div>
          </div>
        </div>

        <div class="section">
          <h3>📋 Next Steps</h3>
          <p><strong>1. Review the Attached PDF:</strong> Complete ${isExpressInterest ? 'interest form' : 'ADLS-compliant offer'} details are in the attached PDF.</p>
          <p><strong>2. Contact the Buyer:</strong> Use the contact information above to respond to the ${isExpressInterest ? 'inquiry' : 'offer'}.</p>
          ${!isExpressInterest ? `<p><strong>3. Consult Your Solicitor:</strong> Before accepting or countering, get legal advice on the offer terms and conditions.</p>` : ''}
          <p><strong>${!isExpressInterest ? '4' : '3'}. Respond Promptly:</strong> Buyers appreciate quick responses. Good communication builds trust.</p>
        </div>

        <div class="section">
          <h3>📄 Document Reference</h3>
          <div class="info-row">
            <div class="info-label">Offer ID:</div>
            <div class="info-value"><code>${offerId}</code></div>
          </div>
          <div class="info-row">
            <div class="info-label">Received:</div>
            <div class="info-value">${new Date().toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p><strong>HouseMatch Property Platform</strong></p>
        <p>Helping connect buyers and sellers across New Zealand</p>
        <p>This is an automated notification. Please do not reply to this email.</p>
      </div>
    </body>
    </html>
  `;
}
