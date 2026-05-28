import { sendGmailEmail, isGmailConfigured, gmailConfig } from './gmail-transport';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sales@swiperight.nz';

export interface ManualReportOrderParams {
  orderId: string;
  reportType: string;
  reportName: string;
  propertyAddress: string | null;
  propertyTitle: string | null;
  provider: string;
  price: string;
  estimatedDays: string | number;
  buyerName: string;
  buyerEmail: string;
  stripePaymentIntentId: string;
  paidAt: Date;
  metadata?: any;
}

/**
 * Send manual report order notification to admin for fulfillment
 */
export async function sendManualReportOrderNotification(
  params: ManualReportOrderParams
): Promise<boolean> {
  if (!isGmailConfigured()) {
    console.warn('⚠️ Gmail not configured - Manual order email not sent');
    console.log('📧 Manual Order Details:', {
      orderId: params.orderId,
      reportType: params.reportType,
      propertyAddress: params.propertyAddress,
      buyerEmail: params.buyerEmail,
    });
    return false;
  }

  try {
    const subject = `🏠 Manual Report Order - ${params.reportType} - Order #${params.orderId.substring(0, 8)}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 650px; margin: 0 auto; background: #fff; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .header p { margin: 10px 0 0 0; opacity: 0.95; font-size: 16px; }
          .content { padding: 30px; background: #f9fafb; }
          .card { background: white; border-radius: 12px; padding: 25px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
          .card h2 { color: #1f2937; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
          .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .info-row:last-child { border-bottom: none; }
          .info-label { font-weight: 600; color: #6b7280; min-width: 180px; }
          .info-value { color: #1f2937; flex: 1; }
          .code { background: #f3f4f6; padding: 6px 12px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 14px; display: inline-block; }
          .highlight { background: #fef3c7; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
          .footer { padding: 25px; text-align: center; color: #6b7280; font-size: 14px; background: #f9fafb; }
          .action-required { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 6px; }
          .action-required p { margin: 0; color: #92400e; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <h1>🏠 New Report Order</h1>
            <p>Manual Processing Required</p>
          </div>

          <!-- Content -->
          <div class="content">
            <!-- Action Required Notice -->
            <div class="action-required">
              <p>⚠️ <strong>Action Required:</strong> A customer has purchased a property report that requires manual fulfillment.</p>
            </div>

            <!-- Order Details -->
            <div class="card">
              <h2>📋 Order Information</h2>
              <div class="info-row">
                <div class="info-label">Order ID:</div>
                <div class="info-value"><span class="code">${params.orderId}</span></div>
              </div>
              <div class="info-row">
                <div class="info-label">Report Type:</div>
                <div class="info-value"><strong>${params.reportName}</strong></div>
              </div>
              <div class="info-row">
                <div class="info-label">Provider:</div>
                <div class="info-value">${params.provider}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Estimated Delivery:</div>
                <div class="info-value">${params.estimatedDays} business days</div>
              </div>
              <div class="info-row">
                <div class="info-label">Payment Amount:</div>
                <div class="info-value"><span class="highlight">$${params.price} NZD</span></div>
              </div>
              <div class="info-row">
                <div class="info-label">Payment Status:</div>
                <div class="info-value" style="color: #059669;">✅ Paid</div>
              </div>
              <div class="info-row">
                <div class="info-label">Paid At:</div>
                <div class="info-value">${new Date(params.paidAt).toLocaleString('en-NZ', { 
                  dateStyle: 'full', 
                  timeStyle: 'short',
                  timeZone: 'Pacific/Auckland' 
                })}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Stripe Payment ID:</div>
                <div class="info-value"><span class="code">${params.stripePaymentIntentId}</span></div>
              </div>
            </div>

            <!-- Property Details -->
            <div class="card">
              <h2>🏡 Property Information</h2>
              ${params.propertyTitle ? `
              <div class="info-row">
                <div class="info-label">Property Title:</div>
                <div class="info-value"><strong>${params.propertyTitle}</strong></div>
              </div>
              ` : ''}
              ${params.propertyAddress ? `
              <div class="info-row">
                <div class="info-label">Address:</div>
                <div class="info-value">${params.propertyAddress}</div>
              </div>
              ` : '<div style="padding: 20px; text-align: center; color: #6b7280;">No property information provided</div>'}
            </div>

            <!-- Customer Details -->
            <div class="card">
              <h2>👤 Customer Information</h2>
              <div class="info-row">
                <div class="info-label">Name:</div>
                <div class="info-value">${params.buyerName}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Email:</div>
                <div class="info-value"><a href="mailto:${params.buyerEmail}" style="color: #667eea; text-decoration: none;">${params.buyerEmail}</a></div>
              </div>
            </div>

            <!-- Next Steps -->
            <div class="card">
              <h2>✅ Next Steps</h2>
              <ol style="margin: 0; padding-left: 20px; color: #1f2937;">
                <li style="margin-bottom: 8px;">Order the report from <strong>${params.provider}</strong></li>
                <li style="margin-bottom: 8px;">Once received, upload it to the HouseMatch admin panel</li>
                <li style="margin-bottom: 8px;">The customer will be automatically notified when the report is ready</li>
                <li style="margin-bottom: 8px;">Expected delivery: <strong>${params.estimatedDays} business days</strong></li>
              </ol>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p>This is an automated notification from HouseMatch.nz</p>
            <p style="margin-top: 8px; color: #9ca3af;">Order placed on ${new Date(params.paidAt).toLocaleDateString('en-NZ')}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
New Manual Report Order - HouseMatch.nz

ORDER INFORMATION
=================
Order ID: ${params.orderId}
Report Type: ${params.reportName}
Provider: ${params.provider}
Estimated Delivery: ${params.estimatedDays} business days
Payment Amount: $${params.price} NZD
Payment Status: ✅ PAID
Paid At: ${new Date(params.paidAt).toLocaleString('en-NZ')}
Stripe Payment ID: ${params.stripePaymentIntentId}

PROPERTY INFORMATION
===================
${params.propertyTitle ? `Property Title: ${params.propertyTitle}\n` : ''}${params.propertyAddress ? `Address: ${params.propertyAddress}` : 'No property information provided'}

CUSTOMER INFORMATION
===================
Name: ${params.buyerName}
Email: ${params.buyerEmail}

NEXT STEPS
==========
1. Order the report from ${params.provider}
2. Once received, upload it to the HouseMatch admin panel
3. The customer will be automatically notified when the report is ready
4. Expected delivery: ${params.estimatedDays} business days

---
This is an automated notification from HouseMatch.nz
Order placed on ${new Date(params.paidAt).toLocaleDateString('en-NZ')}
    `;

    const result = await sendGmailEmail({
      to: ADMIN_EMAIL,
      subject,
      text: textContent,
      html: htmlContent,
      fromName: 'HouseMatch NZ - Order Notifications',
    });

    if (!result.success) {
      console.error('❌ Failed to send manual report order notification:', result.error);
      return false;
    }
    
    console.log(`✅ Manual report order notification sent to ${ADMIN_EMAIL}`);
    console.log(`   Order ID: ${params.orderId}`);
    console.log(`   Report Type: ${params.reportType}`);
    console.log(`   Property: ${params.propertyAddress || 'N/A'}`);
    
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send manual report order notification:', error);
    return false;
  }
}
