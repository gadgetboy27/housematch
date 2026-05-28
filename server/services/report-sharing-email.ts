import { sendGmailEmail, isGmailConfigured, gmailConfig } from './gmail-transport';

interface ShareReportEmailParams {
  recipientEmail: string;
  recipientName?: string;
  sharedByName: string;
  sharedByEmail: string;
  reportType: string;
  propertyAddress: string;
  reportUrl?: string;
  orderId: string;
}

export async function sendReportShareEmail(params: ShareReportEmailParams): Promise<{
  success: boolean;
  error?: string;
}> {
  const {
    recipientEmail,
    recipientName,
    sharedByName,
    sharedByEmail,
    reportType,
    propertyAddress,
    reportUrl,
    orderId,
  } = params;

  if (!isGmailConfigured()) {
    console.warn('⚠️  Gmail not configured - skipping report share email');
    return { success: false, error: 'Gmail not configured' };
  }

  const reportTypeLabel = formatReportType(reportType);
  const recipientDisplay = recipientName || recipientEmail;

  const emailHtml = generateShareEmailHTML({
    recipientDisplay,
    sharedByName,
    sharedByEmail,
    reportTypeLabel,
    propertyAddress,
    reportUrl,
    orderId,
  });

  try {
    const result = await sendGmailEmail({
      to: recipientEmail,
      subject: `${sharedByName} shared a property report with you - ${propertyAddress}`,
      html: emailHtml,
      fromName: 'HouseMatch NZ',
    });

    if (!result.success) {
      console.error('❌ Failed to send report share email:', result.error);
      return {
        success: false,
        error: result.error || 'Failed to send email',
      };
    }

    console.log(`✅ Report share email sent to ${recipientEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Failed to send report share email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

function formatReportType(reportType: string): string {
  const labels: Record<string, string> = {
    title_search: 'Title Search Report',
    lim_auckland: 'LIM Report (Auckland)',
    lim_wellington: 'LIM Report (Wellington)',
    lim_christchurch: 'LIM Report (Christchurch)',
    building_inspection: 'Building Inspection Report',
    meth_testing: 'Meth Testing Report',
    rental_data: 'Rental Data Analysis',
  };
  return labels[reportType] || reportType;
}

function generateShareEmailHTML(data: {
  recipientDisplay: string;
  sharedByName: string;
  sharedByEmail: string;
  reportTypeLabel: string;
  propertyAddress: string;
  reportUrl?: string;
  orderId: string;
}): string {
  const { recipientDisplay, sharedByName, sharedByEmail, reportTypeLabel, propertyAddress, reportUrl, orderId } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 30px; 
          text-align: center; 
          border-radius: 8px 8px 0 0; 
        }
        .content { 
          background: #f9f9f9; 
          padding: 30px; 
          border-radius: 0 0 8px 8px; 
        }
        .section { 
          background: white; 
          padding: 20px; 
          margin-bottom: 20px; 
          border-radius: 8px; 
          box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
        }
        .section h3 { 
          color: #667eea; 
          margin-top: 0; 
          border-bottom: 2px solid #667eea; 
          padding-bottom: 10px; 
        }
        .info-row { 
          display: flex; 
          margin-bottom: 10px; 
        }
        .info-label { 
          font-weight: bold; 
          width: 150px; 
          color: #666; 
        }
        .info-value { 
          flex: 1; 
          color: #333; 
        }
        .highlight { 
          background: #e8f4f8; 
          padding: 15px; 
          border-left: 4px solid #667eea; 
          margin: 15px 0; 
        }
        .button { 
          display: inline-block; 
          background: #667eea; 
          color: white !important; 
          padding: 12px 30px; 
          text-decoration: none; 
          border-radius: 6px; 
          margin-top: 20px;
          text-align: center;
        }
        .button:hover {
          background: #5568d3;
        }
        .security-notice {
          background: #fff3cd;
          border: 1px solid #ffc107;
          padding: 15px;
          border-radius: 6px;
          margin-top: 20px;
        }
        .security-notice strong {
          color: #856404;
        }
        .footer { 
          text-align: center; 
          color: #999; 
          font-size: 12px; 
          margin-top: 30px; 
          padding-top: 20px; 
          border-top: 1px solid #ddd; 
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📄 Property Report Shared With You</h1>
        <p>${sharedByName} has shared a property report with you</p>
      </div>
      
      <div class="content">
        <div class="section">
          <h3>👤 Shared By</h3>
          <div class="info-row">
            <div class="info-label">Name:</div>
            <div class="info-value">${sharedByName}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Email:</div>
            <div class="info-value">${sharedByEmail}</div>
          </div>
        </div>

        <div class="section">
          <h3>📋 Report Details</h3>
          <div class="highlight">
            <div class="info-row">
              <div class="info-label">Report Type:</div>
              <div class="info-value"><strong>${reportTypeLabel}</strong></div>
            </div>
          </div>
          <div class="info-row">
            <div class="info-label">Property:</div>
            <div class="info-value">${propertyAddress}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Order ID:</div>
            <div class="info-value"><code>${orderId}</code></div>
          </div>
        </div>

        ${reportUrl ? `
        <div class="section" style="text-align: center;">
          <h3>📥 Access Report</h3>
          <p>Click the button below to view the shared report:</p>
          <a href="${reportUrl}" class="button" target="_blank">
            View Report
          </a>
          <p style="font-size: 12px; color: #666; margin-top: 15px;">
            Or copy this link: <a href="${reportUrl}">${reportUrl}</a>
          </p>
        </div>
        ` : `
        <div class="section">
          <h3>📥 Report Delivery</h3>
          <p>The report will be delivered to you shortly. You'll receive another email once it's ready.</p>
        </div>
        `}

        <div class="security-notice">
          <strong>🔒 Security Notice:</strong> This property report contains confidential legal and financial information. It was shared with you by ${sharedByName} (${sharedByEmail}). Please handle this document with appropriate care and do not forward it to unauthorized parties.
        </div>
      </div>

      <div class="footer">
        <p><strong>HouseMatch NZ</strong></p>
        <p>New Zealand's Property Discovery Platform</p>
        <p>This is an automated notification. Please do not reply to this email.</p>
        <p style="margin-top: 10px; font-size: 11px; color: #aaa;">
          If you believe you received this email in error, please contact the sender directly.
        </p>
      </div>
    </body>
    </html>
  `;
}
