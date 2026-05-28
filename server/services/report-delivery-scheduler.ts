/**
 * Report Delivery Scheduler Service
 * Automatically delivers reports after scheduled delay (e.g., 2 business days)
 * Checks for orders ready to deliver and triggers email sending
 */

import { db } from '../db.js';
import { purchaseOrders, propertyReports, users, properties } from '../../shared/schema.js';
import { eq, and, lte, or, isNull } from 'drizzle-orm';
import { titleSearchPDFService, TitleSearchPDFData } from './title-search-pdf.js';
import { linzApi } from './linz-api.js';
import { sendGmailEmail, isGmailConfigured, gmailConfig } from './gmail-transport.js';

export interface DeliveryResult {
  orderID: string;
  success: boolean;
  error?: string;
  reportUrl?: string;
}

class ReportDeliveryScheduler {
  /**
   * Process all pending reports ready for delivery
   * Returns array of delivery results
   */
  async processScheduledDeliveries(): Promise<DeliveryResult[]> {
    console.log('📅 Checking for reports ready to deliver...');

    try {
      // Find all orders that are:
      // 1. Paid (paidAt is not null)
      // 2. Not yet completed (status != 'completed')
      // 3. Scheduled for delivery now or earlier (deliveryScheduledFor <= now)
      // 4. Are Title Search reports (we only automate these for now)
      const now = new Date();
      
      const ordersReadyToDeliver = await db
        .select({
          order: purchaseOrders,
          user: users,
          property: properties,
        })
        .from(purchaseOrders)
        .leftJoin(users, eq(purchaseOrders.userId, users.id))
        .leftJoin(properties, eq(purchaseOrders.propertyId, properties.id))
        .where(
          and(
            eq(purchaseOrders.reportType, 'title_search'),
            eq(purchaseOrders.status, 'processing'),
            lte(purchaseOrders.deliveryScheduledFor, now),
            or(
              isNull(purchaseOrders.deliveryAttempts),
              lte(purchaseOrders.deliveryAttempts, 3) // Max 3 retry attempts
            )
          )
        );

      console.log(`📦 Found ${ordersReadyToDeliver.length} reports ready to deliver`);

      if (ordersReadyToDeliver.length === 0) {
        return [];
      }

      // Process each order
      const results: DeliveryResult[] = [];
      
      for (const row of ordersReadyToDeliver) {
        try {
          const result = await this.deliverSingleReport(row.order, row.user, row.property);
          results.push(result);
        } catch (error: any) {
          console.error(`❌ Failed to deliver order ${row.order.id}:`, error);
          results.push({
            orderID: row.order.id,
            success: false,
            error: error.message,
          });
        }
      }

      return results;

    } catch (error: any) {
      console.error('❌ Error processing scheduled deliveries:', error);
      throw error;
    }
  }

  /**
   * Deliver a single report
   */
  private async deliverSingleReport(
    order: any,
    user: any,
    property: any
  ): Promise<DeliveryResult> {
    console.log(`📧 Delivering report for order ${order.id}...`);

    try {
      // Update delivery attempt count
      await db
        .update(purchaseOrders)
        .set({
          deliveryAttempts: (order.deliveryAttempts || 0) + 1,
          lastDeliveryAttempt: new Date(),
        })
        .where(eq(purchaseOrders.id, order.id));

      // Generate the PDF report
      const pdfData = await this.prepareReportData(order, user, property);
      const pdfBuffer = await titleSearchPDFService.generatePDF(pdfData);
      const filename = titleSearchPDFService.generateFilename(pdfData.titleNumber);

      // Send email with PDF attachment
      await this.sendReportEmail(user, order, property, pdfBuffer, filename);

      // Mark order as completed
      await db
        .update(purchaseOrders)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, order.id));

      // Create property report record
      await db.insert(propertyReports).values({
        orderId: order.id,
        userId: order.userId,
        propertyId: order.propertyId,
        reportType: 'title_search',
        reportTitle: `Title Search - ${order.propertyAddress}`,
        provider: 'linz',
        deliveredAt: new Date(),
      });

      console.log(`✅ Report delivered successfully for order ${order.id}`);

      return {
        orderID: order.id,
        success: true,
      };

    } catch (error: any) {
      console.error(`❌ Failed to deliver report ${order.id}:`, error);
      
      // If max attempts reached, mark as failed
      if ((order.deliveryAttempts || 0) >= 3) {
        await db
          .update(purchaseOrders)
          .set({ status: 'failed' })
          .where(eq(purchaseOrders.id, order.id));
      }

      return {
        orderID: order.id,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Prepare PDF data from order
   */
  private async prepareReportData(
    order: any,
    user: any,
    property: any
  ): Promise<TitleSearchPDFData> {
    // Extract LINZ data from property or fetch it
    let linzData: any;

    if (property?.linzTitleNumber) {
      // Use existing LINZ data from property
      linzData = {
        titleNumber: property.linzTitleNumber,
        landDistrict: property.linzLandDistrict || 'Unknown',
        legalDescription: property.linzLegalDescription || 'Not available',
        titleType: property.linzTitleType || 'Unknown',
        titleStatus: property.linzTitleStatus || 'Unknown',
        issueDate: property.linzIssueDate || null,
        area: property.linzArea ? parseFloat(property.linzArea) : null,
      };
    } else {
      // Fetch LINZ data using address
      const address = order.propertyAddress?.split(',')[0] || '';
      const city = order.propertyAddress?.split(',').pop()?.trim() || '';
      
      const verificationResult = await linzApi.verifyPropertyAddress(address, city);
      
      linzData = {
        titleNumber: verificationResult.titleNumber || 'Not available',
        landDistrict: (verificationResult as any).landDistrict || 'Unknown',
        legalDescription: verificationResult.legalDescription || 'Not available',
        titleType: verificationResult.titleType || 'Unknown',
        titleStatus: verificationResult.status || 'Unknown',
        issueDate: (verificationResult as any).issueDate || null,
        area: null,
      };
    }

    return {
      orderNumber: order.id.substring(0, 8).toUpperCase(),
      propertyAddress: order.propertyAddress || 'Unknown',
      titleNumber: linzData.titleNumber,
      linzData,
      customerName: user?.name || 'Valued Customer',
      customerEmail: user?.email || '',
      generatedDate: new Date(),
      deliveryDate: new Date(),
    };
  }

  /**
   * Send report email with PDF attachment
   */
  private async sendReportEmail(
    user: any,
    order: any,
    property: any,
    pdfBuffer: Buffer,
    filename: string
  ): Promise<void> {
    if (!isGmailConfigured()) {
      console.warn('⚠️ Gmail not configured, skipping email delivery');
      return;
    }

    const result = await sendGmailEmail({
      to: user.email,
      subject: 'Your Title Search Report is Ready 📄',
      text: this.generateEmailText(user, order),
      html: this.generateEmailHTML(user, order),
      attachments: [
        {
          filename: filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
      fromName: gmailConfig.fromName,
    });

    if (!result.success) {
      throw new Error(`Failed to send report email: ${result.error}`);
    }

    console.log(`✅ Report email sent to ${user.email}`);
  }

  /**
   * Generate plain text email content
   */
  private generateEmailText(user: any, order: any): string {
    return `
Hi ${user.name || 'there'},

Your Title Search Report is Ready!
━━━━━━━━━━━━━━━━━━━━

Property: ${order.propertyAddress}
Order #${order.id.substring(0, 8).toUpperCase()}

Your professional title search report is attached to this email.

This report includes:
✓ Current registered owner
✓ All mortgages and liens  
✓ Easements and covenants
✓ Full legal description

Questions? Simply reply to this email and we'll be happy to help.

Best regards,
The HouseMatch.nz Team

━━━━━━━━━━━━━━━━━━━━
HouseMatch.nz - Property Intelligence Platform
info@swiperight.nz
    `.trim();
  }

  /**
   * Generate HTML email content
   */
  private generateEmailHTML(user: any, order: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #374151; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .property-box { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .checklist { list-style: none; padding: 0; }
    .checklist li { padding: 8px 0; }
    .checklist li:before { content: '✓ '; color: #10b981; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .cta { display: inline-block; background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Your Title Search Report is Ready!</h1>
    </div>
    
    <div class="content">
      <p>Hi <strong>${user.name || 'there'}</strong>,</p>
      
      <p>Great news! Your professional title search report has been completed and is attached to this email.</p>
      
      <div class="property-box">
        <h3 style="margin-top: 0; color: #1e40af;">📍 ${order.propertyAddress}</h3>
        <p style="margin: 5px 0; color: #6b7280;">Order #${order.id.substring(0, 8).toUpperCase()}</p>
      </div>
      
      <h3>This report includes:</h3>
      <ul class="checklist">
        <li>Current registered owner details</li>
        <li>All mortgages and liens</li>
        <li>Easements and covenants</li>
        <li>Full legal description</li>
      </ul>
      
      <p style="margin-top: 30px;">The attached PDF contains all the official LINZ (Land Information New Zealand) title information for this property.</p>
      
      <p><strong>Questions?</strong> Simply reply to this email and we'll be happy to help.</p>
    </div>
    
    <div class="footer">
      <p><strong>HouseMatch.nz</strong> - Property Intelligence Platform</p>
      <p>info@swiperight.nz</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Manually trigger delivery for a specific order (admin use)
   */
  async deliverOrderNow(orderId: string): Promise<DeliveryResult> {
    console.log(`🚀 Manually triggering delivery for order ${orderId}`);

    const row = await db
      .select({
        order: purchaseOrders,
        user: users,
        property: properties,
      })
      .from(purchaseOrders)
      .leftJoin(users, eq(purchaseOrders.userId, users.id))
      .leftJoin(properties, eq(purchaseOrders.propertyId, properties.id))
      .where(eq(purchaseOrders.id, orderId))
      .limit(1);

    if (row.length === 0) {
      throw new Error(`Order ${orderId} not found`);
    }

    return this.deliverSingleReport(row[0].order, row[0].user, row[0].property);
  }
}

export const reportDeliveryScheduler = new ReportDeliveryScheduler();
