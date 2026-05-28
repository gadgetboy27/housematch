import { db } from '../db';
import { emailQueue, sentEmails, emailNotificationPreferences, properties, users } from '@shared/schema';
import { eq, and, lte } from 'drizzle-orm';
import { sendGmailEmail, isGmailConfigured, gmailConfig } from './gmail-transport';

// Gmail configuration check
if (!isGmailConfigured()) {
  console.warn('⚠️  Gmail not configured - email notifications will be queued but not sent');
}

const FROM_EMAIL = gmailConfig.fromEmail;
const FROM_NAME = gmailConfig.fromName;

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  /**
   * Queue an email to be sent
   */
  static async queueEmail(params: {
    userId?: string;
    recipientEmail: string;
    recipientName?: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
    notificationType: string;
    propertyId?: string;
    orderId?: string;
    scheduledFor?: Date;
  }): Promise<void> {
    try {
      await db.insert(emailQueue).values({
        userId: params.userId,
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        subject: params.subject,
        htmlContent: params.htmlContent,
        textContent: params.textContent || this.htmlToText(params.htmlContent),
        notificationType: params.notificationType,
        propertyId: params.propertyId,
        orderId: params.orderId,
        status: 'pending',
        scheduledFor: params.scheduledFor || new Date(),
      });

      console.log(`✉️  Email queued: ${params.notificationType} to ${params.recipientEmail}`);
    } catch (error) {
      console.error('Failed to queue email:', error);
      throw error;
    }
  }

  /**
   * Send queued emails
   */
  static async processEmailQueue(): Promise<void> {
    try {
      // Get pending emails that are scheduled to be sent
      const pendingEmails = await db
        .select()
        .from(emailQueue)
        .where(
          and(
            eq(emailQueue.status, 'pending'),
            lte(emailQueue.scheduledFor, new Date())
          )
        )
        .limit(50); // Process in batches

      for (const email of pendingEmails) {
        await this.sendEmail(email);
      }
    } catch (error) {
      console.error('Failed to process email queue:', error);
    }
  }

  /**
   * Send a single email
   */
  private static async sendEmail(email: any): Promise<void> {
    if (!isGmailConfigured()) {
      console.log(`📧 Email would be sent to ${email.recipientEmail} (Gmail not configured)`);
      return;
    }

    try {
      // Update status to sending
      await db
        .update(emailQueue)
        .set({ status: 'sending', lastAttemptAt: new Date() })
        .where(eq(emailQueue.id, email.id));

      // Send via Gmail
      const result = await sendGmailEmail({
        to: email.recipientEmail,
        subject: email.subject,
        text: email.textContent,
        html: email.htmlContent,
        fromName: FROM_NAME,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      const messageId = result.messageId || '';

      // Mark as sent
      await db
        .update(emailQueue)
        .set({ status: 'sent', sentAt: new Date() })
        .where(eq(emailQueue.id, email.id));

      // Log to sent emails
      await db.insert(sentEmails).values({
        userId: email.userId,
        queueId: email.id,
        recipientEmail: email.recipientEmail,
        subject: email.subject,
        notificationType: email.notificationType,
        sendgridMessageId: messageId, // Keep field name for backward compatibility
        propertyId: email.propertyId,
        orderId: email.orderId,
        sentAt: new Date(),
      });

      console.log(`✅ Email sent: ${email.subject} to ${email.recipientEmail}`);
    } catch (error: any) {
      console.error(`❌ Failed to send email to ${email.recipientEmail}:`, error);

      // Update with error
      await db
        .update(emailQueue)
        .set({
          status: 'failed',
          attempts: email.attempts + 1,
          errorMessage: error.message || String(error),
          lastAttemptAt: new Date(),
        })
        .where(eq(emailQueue.id, email.id));

      // Retry logic - retry up to 3 times
      if (email.attempts < 3) {
        await db
          .update(emailQueue)
          .set({
            status: 'pending',
            scheduledFor: new Date(Date.now() + 5 * 60 * 1000), // Retry in 5 minutes
          })
          .where(eq(emailQueue.id, email.id));
      }
    }
  }

  /**
   * Check if user wants this type of notification
   */
  static async canSendNotification(userId: string, notificationType: string): Promise<boolean> {
    try {
      const prefs = await db
        .select()
        .from(emailNotificationPreferences)
        .where(eq(emailNotificationPreferences.userId, userId))
        .limit(1);

      if (prefs.length === 0) {
        // Default to true if no preferences set
        return true;
      }

      const pref = prefs[0];

      // Map notification type to preference field
      switch (notificationType) {
        case 'new_match':
          return pref.newMatchingProperties ?? true;
        case 'price_drop':
          return pref.priceDropAlerts ?? true;
        case 'property_status':
          return pref.propertyStatusUpdates ?? true;
        case 'report_ready':
          return pref.reportReadyAlerts ?? true;
        case 'report_expiring':
          return pref.reportExpiringAlerts ?? true;
        case 'account_activity':
          return pref.accountActivity ?? true;
        case 'marketing':
          return pref.marketingEmails ?? false;
        case 'weekly_digest':
          return pref.weeklyDigest ?? true;
        default:
          return true;
      }
    } catch (error) {
      console.error('Failed to check notification preferences:', error);
      return true; // Default to sending on error
    }
  }

  /**
   * Send new property match notification
   */
  static async sendNewPropertyMatch(userId: string, userEmail: string, userName: string, property: any): Promise<void> {
    const canSend = await this.canSendNotification(userId, 'new_match');
    if (!canSend) return;

    const template = this.getNewPropertyMatchTemplate(userName, property);

    await this.queueEmail({
      userId,
      recipientEmail: userEmail,
      recipientName: userName,
      subject: template.subject,
      htmlContent: template.html,
      textContent: template.text,
      notificationType: 'new_match',
      propertyId: property.id,
    });
  }

  /**
   * Send price drop alert
   */
  static async sendPriceDropAlert(userId: string, userEmail: string, userName: string, property: any, oldPrice: string, newPrice: string): Promise<void> {
    const canSend = await this.canSendNotification(userId, 'price_drop');
    if (!canSend) return;

    const template = this.getPriceDropTemplate(userName, property, oldPrice, newPrice);

    await this.queueEmail({
      userId,
      recipientEmail: userEmail,
      recipientName: userName,
      subject: template.subject,
      htmlContent: template.html,
      textContent: template.text,
      notificationType: 'price_drop',
      propertyId: property.id,
    });
  }

  /**
   * Send report ready notification
   */
  static async sendReportReady(userId: string, userEmail: string, userName: string, reportType: string, propertyAddress: string, orderId: string): Promise<void> {
    const canSend = await this.canSendNotification(userId, 'report_ready');
    if (!canSend) return;

    const template = this.getReportReadyTemplate(userName, reportType, propertyAddress);

    await this.queueEmail({
      userId,
      recipientEmail: userEmail,
      recipientName: userName,
      subject: template.subject,
      htmlContent: template.html,
      textContent: template.text,
      notificationType: 'report_ready',
      orderId,
    });
  }

  /**
   * Email Templates
   */
  private static getNewPropertyMatchTemplate(userName: string, property: any): EmailTemplate {
    return {
      subject: `🏡 New Property Match: ${property.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">HouseMatch NZ</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">New Property Match</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e1e8ed; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333;">Hi ${userName},</p>
            
            <p style="font-size: 16px; color: #333;">A new property matching your preferences just hit the market!</p>
            
            <div style="background: #f7f9fc; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h2 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 20px;">${property.title}</h2>
              <p style="margin: 5px 0; color: #666; font-size: 14px;">📍 ${property.address}, ${property.suburb}</p>
              <p style="margin: 15px 0 5px 0; font-size: 24px; font-weight: bold; color: #667eea;">${property.price}</p>
              <p style="margin: 5px 0; color: #666; font-size: 14px;">
                🛏️ ${property.bedrooms} bed • 🚿 ${property.bathrooms} bath • 🚗 ${property.carSpaces} car
              </p>
            </div>
            
            <a href="${process.env.APP_URL || 'https://housematch.nz'}/properties/${property.id}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0;">
              View Property
            </a>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              Don't want these alerts? <a href="${process.env.APP_URL || 'https://housematch.nz'}/profile/notifications" style="color: #667eea;">Manage your preferences</a>
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2025 HouseMatch NZ. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${userName},\n\nA new property matching your preferences just hit the market!\n\n${property.title}\n${property.address}, ${property.suburb}\n${property.price}\n${property.bedrooms} bed • ${property.bathrooms} bath • ${property.carSpaces} car\n\nView it here: ${process.env.APP_URL || 'https://housematch.nz'}/properties/${property.id}\n\nDon't want these alerts? Manage your preferences at ${process.env.APP_URL || 'https://housematch.nz'}/profile/notifications`,
    };
  }

  private static getPriceDropTemplate(userName: string, property: any, oldPrice: string, newPrice: string): EmailTemplate {
    return {
      subject: `💰 Price Drop Alert: ${property.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">HouseMatch NZ</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">💰 Price Drop Alert</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e1e8ed; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333;">Hi ${userName},</p>
            
            <p style="font-size: 16px; color: #333;">Great news! A property you liked just dropped in price!</p>
            
            <div style="background: #f7f9fc; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h2 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 20px;">${property.title}</h2>
              <p style="margin: 5px 0; color: #666; font-size: 14px;">📍 ${property.address}, ${property.suburb}</p>
              
              <div style="margin: 15px 0;">
                <p style="margin: 0; text-decoration: line-through; color: #999; font-size: 16px;">${oldPrice}</p>
                <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: bold; color: #f5576c;">${newPrice}</p>
                <p style="margin: 5px 0; color: #22c55e; font-weight: 600; font-size: 14px;">
                  💸 Price Reduced!
                </p>
              </div>
            </div>
            
            <a href="${process.env.APP_URL || 'https://housematch.nz'}/properties/${property.id}" 
               style="display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0;">
              View Property Now
            </a>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              Don't want these alerts? <a href="${process.env.APP_URL || 'https://swiperight.nz'}/profile/notifications" style="color: #f5576c;">Manage your preferences</a>
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2025 HouseMatch NZ. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${userName},\n\nGreat news! A property you liked just dropped in price!\n\n${property.title}\n${property.address}, ${property.suburb}\n\nWas: ${oldPrice}\nNow: ${newPrice}\n💸 Price Reduced!\n\nView it here: ${process.env.APP_URL || 'https://housematch.nz'}/properties/${property.id}\n\nDon't want these alerts? Manage your preferences at ${process.env.APP_URL || 'https://housematch.nz'}/profile/notifications`,
    };
  }

  private static getReportReadyTemplate(userName: string, reportType: string, propertyAddress: string): EmailTemplate {
    const reportNames: Record<string, string> = {
      title_search: 'Title Search',
      lim: 'LIM Report',
      building_inspection: 'Building Inspection',
      rental_data: 'Rental Market Analysis',
      complete_package: 'Complete Property Package',
    };

    const reportName = reportNames[reportType] || reportType;

    return {
      subject: `✅ Your ${reportName} is Ready`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">HouseMatch NZ</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">✅ Report Ready</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e1e8ed; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333;">Hi ${userName},</p>
            
            <p style="font-size: 16px; color: #333;">Your property report is now ready to view!</p>
            
            <div style="background: #f7f9fc; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h2 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 20px;">${reportName}</h2>
              <p style="margin: 5px 0; color: #666; font-size: 14px;">📍 ${propertyAddress}</p>
              <p style="margin: 15px 0 0 0; color: #22c55e; font-weight: 600; font-size: 14px;">
                ✅ Report Delivered
              </p>
            </div>
            
            <a href="${process.env.APP_URL || 'https://housematch.nz'}/reports" 
               style="display: inline-block; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0;">
              View Report
            </a>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              Your report will be available for download for 90 days.
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2025 HouseMatch NZ. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${userName},\n\nYour property report is now ready to view!\n\n${reportName}\n${propertyAddress}\n\n✅ Report Delivered\n\nView it here: ${process.env.APP_URL || 'https://housematch.nz'}/reports\n\nYour report will be available for download for 90 days.`,
    };
  }

  /**
   * Send partner signup notification to admin
   */
  static async sendPartnerSignupNotification(partnerData: {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    accountType: string;
    serviceTypes: string[];
    regions: string[];
    website?: string;
    description?: string;
    businessAddress?: string;
  }): Promise<void> {
    const template = this.getPartnerSignupTemplate(partnerData);

    // Send immediately via Gmail instead of queuing
    const result = await sendGmailEmail({
      to: 'admin@swiperight.nz',
      subject: template.subject,
      text: template.text,
      html: template.html,
      fromName: FROM_NAME,
    });

    if (!result.success) {
      console.error('❌ Failed to send partner signup notification:', result.error);
      throw new Error(`Email sending failed: ${result.error}`);
    }

    console.log(`✅ Partner signup notification sent to admin@swiperight.nz`);
  }

  private static getPartnerSignupTemplate(partnerData: {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    accountType: string;
    serviceTypes: string[];
    regions: string[];
    website?: string;
    description?: string;
    businessAddress?: string;
  }): EmailTemplate {
    const accountTypeLabel = partnerData.accountType === 'preferred_client' 
      ? 'Preferred Client ($99/month)' 
      : 'Service Partner (10-15% platform fee)';

    return {
      subject: `🆕 New Partner Application: ${partnerData.companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">HouseMatch NZ</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">🆕 New Partner Application</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e1e8ed; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333;">Hi Admin,</p>
            
            <p style="font-size: 16px; color: #333;">A new partner has submitted an application and is awaiting verification.</p>
            
            <div style="background: #f7f9fc; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 20px;">${partnerData.companyName}</h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px; width: 140px;"><strong>Account Type:</strong></td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px;">${accountTypeLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Contact Name:</strong></td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px;">${partnerData.contactName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Email:</strong></td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px;"><a href="mailto:${partnerData.email}" style="color: #667eea;">${partnerData.email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Phone:</strong></td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px;"><a href="tel:${partnerData.phone}" style="color: #667eea;">${partnerData.phone}</a></td>
                </tr>
                ${partnerData.businessAddress ? `
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Address:</strong></td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px;">${partnerData.businessAddress}</td>
                </tr>
                ` : ''}
                ${partnerData.website ? `
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Website:</strong></td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px;"><a href="${partnerData.website}" style="color: #667eea;" target="_blank">${partnerData.website}</a></td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Services:</strong></td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px;">${partnerData.serviceTypes.join(', ')}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Regions:</strong></td>
                  <td style="padding: 8px 0; color: #333; font-size: 14px;">${partnerData.regions.join(', ')}</td>
                </tr>
              </table>
              
              ${partnerData.description ? `
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e1e8ed;">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;"><strong>Description:</strong></p>
                <p style="margin: 0; color: #333; font-size: 14px;">${partnerData.description}</p>
              </div>
              ` : ''}
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⚠️ Action Required:</strong> This partner application is pending verification. Please review and create their login account in the admin dashboard.
              </p>
            </div>
            
            <a href="${process.env.APP_URL || 'https://housematch.nz'}/admin/partners" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0;">
              Review in Admin Dashboard
            </a>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2025 HouseMatch NZ. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `Hi Admin,\n\nA new partner has submitted an application and is awaiting verification.\n\nCompany Name: ${partnerData.companyName}\nAccount Type: ${accountTypeLabel}\nContact Name: ${partnerData.contactName}\nEmail: ${partnerData.email}\nPhone: ${partnerData.phone}\n${partnerData.businessAddress ? `Address: ${partnerData.businessAddress}\n` : ''}${partnerData.website ? `Website: ${partnerData.website}\n` : ''}Services: ${partnerData.serviceTypes.join(', ')}\nRegions: ${partnerData.regions.join(', ')}\n${partnerData.description ? `\nDescription: ${partnerData.description}\n` : ''}\n\n⚠️ Action Required: This partner application is pending verification. Please review and create their login account in the admin dashboard.\n\nReview here: ${process.env.APP_URL || 'https://housematch.nz'}/admin/partners`,
    };
  }

  /**
   * Send partner approval email with login credentials
   */
  static async sendPartnerApprovalEmail(partnerData: {
    companyName: string;
    contactName: string;
    email: string;
    loginEmail: string;
    temporaryPassword: string;
    accountType: string;
  }): Promise<void> {
    const template = this.getPartnerApprovalTemplate(partnerData);

    // Send immediately via Gmail instead of queuing
    const result = await sendGmailEmail({
      to: partnerData.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
      fromName: FROM_NAME,
    });

    if (!result.success) {
      console.error('❌ Failed to send partner approval email:', result.error);
      throw new Error(`Email sending failed: ${result.error}`);
    }

    console.log(`✅ Partner approval email sent to ${partnerData.email}`);
  }

  private static getPartnerApprovalTemplate(partnerData: {
    companyName: string;
    contactName: string;
    email: string;
    loginEmail: string;
    temporaryPassword: string;
    accountType: string;
  }): EmailTemplate {
    const accountTypeLabel = partnerData.accountType === 'preferred_client' 
      ? 'Preferred Client' 
      : 'Service Partner';

    return {
      subject: `✅ Welcome to HouseMatch - Your Partner Account is Approved!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">HouseMatch NZ</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">✅ Welcome to Our Partner Network!</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e1e8ed; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333;">Hi ${partnerData.contactName},</p>
            
            <p style="font-size: 16px; color: #333;">Great news! Your application to join HouseMatch as a <strong>${accountTypeLabel}</strong> has been approved. We're excited to have ${partnerData.companyName} as part of our partner network.</p>
            
            <div style="background: #d4edda; border: 1px solid #28a745; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="margin: 0 0 15px 0; color: #155724; font-size: 18px;">🔑 Your Login Credentials</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #155724; font-size: 14px; width: 180px;"><strong>Partner Portal URL:</strong></td>
                  <td style="padding: 8px 0; color: #155724; font-size: 14px;">
                    <a href="${process.env.APP_URL || 'https://housematch.nz'}/partner/login" style="color: #667eea;">
                      ${process.env.APP_URL || 'https://housematch.nz'}/partner/login
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #155724; font-size: 14px;"><strong>Login Email:</strong></td>
                  <td style="padding: 8px 0; color: #155724; font-size: 14px;">${partnerData.loginEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #155724; font-size: 14px;"><strong>Temporary Password:</strong></td>
                  <td style="padding: 8px 0; color: #155724; font-size: 14px;"><code style="background: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${partnerData.temporaryPassword}</code></td>
                </tr>
              </table>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⚠️ Security Notice:</strong> Please log in and change your password immediately. This temporary password will be sent only once.
              </p>
            </div>
            
            <h3 style="color: #1a1a1a; margin: 30px 0 15px 0;">Next Steps:</h3>
            <ol style="padding-left: 20px; color: #333; font-size: 15px; line-height: 1.8;">
              <li>Click the button below to access the partner portal</li>
              <li>Log in using the credentials above</li>
              <li>Change your temporary password to a secure one</li>
              <li>Complete your partner profile</li>
              ${partnerData.accountType === 'preferred_client' ? '<li>Set up your subscription billing</li>' : '<li>Review your commission structure</li>'}
              <li>Start receiving ${partnerData.accountType === 'preferred_client' ? 'client referrals' : 'service orders'}</li>
            </ol>
            
            <a href="${process.env.APP_URL || 'https://housematch.nz'}/partner/login" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; text-align: center;">
              Access Partner Portal
            </a>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              If you have any questions or need assistance, please don't hesitate to reach out to our team.
            </p>
            
            <p style="font-size: 14px; color: #666;">
              Welcome aboard!<br>
              The HouseMatch Team
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2025 HouseMatch NZ. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${partnerData.contactName},\n\nGreat news! Your application to join HouseMatch as a ${accountTypeLabel} has been approved. We're excited to have ${partnerData.companyName} as part of our partner network.\n\n🔑 YOUR LOGIN CREDENTIALS\n\nPartner Portal: ${process.env.APP_URL || 'https://housematch.nz'}/partner/login\nLogin Email: ${partnerData.loginEmail}\nTemporary Password: ${partnerData.temporaryPassword}\n\n⚠️ SECURITY NOTICE: Please log in and change your password immediately. This temporary password will be sent only once.\n\nNEXT STEPS:\n1. Access the partner portal using the link above\n2. Log in using the credentials provided\n3. Change your temporary password to a secure one\n4. Complete your partner profile\n${partnerData.accountType === 'preferred_client' ? '5. Set up your subscription billing\n6. Start receiving client referrals' : '5. Review your commission structure\n6. Start receiving service orders'}\n\nIf you have any questions or need assistance, please don't hesitate to reach out to our team.\n\nWelcome aboard!\nThe HouseMatch Team`,
    };
  }

  /**
   * Send partner approval email WITH Stripe payment link (Preferred Clients only)
   */
  static async sendPartnerApprovalWithPayment(partnerData: {
    companyName: string;
    contactName: string;
    email: string;
    paymentLink: string;
    accountType: string;
  }): Promise<void> {
    const template = this.getPartnerApprovalWithPaymentTemplate(partnerData);

    // Send immediately via Gmail instead of queuing
    const result = await sendGmailEmail({
      to: partnerData.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
      fromName: FROM_NAME,
    });

    if (!result.success) {
      console.error('❌ Failed to send partner approval with payment email:', result.error);
      throw new Error(`Email sending failed: ${result.error}`);
    }

    console.log(`✅ Partner approval with payment link sent to ${partnerData.email}`);
  }

  private static getPartnerApprovalWithPaymentTemplate(partnerData: {
    companyName: string;
    contactName: string;
    email: string;
    paymentLink: string;
    accountType: string;
  }): EmailTemplate {
    return {
      subject: `🎉 Congratulations! Your HouseMatch Partner Application has been Approved`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">You're Approved to Join HouseMatch</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e1e8ed; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333;">Hi ${partnerData.contactName},</p>
            
            <p style="font-size: 16px; color: #333;">
              Great news! Your application to join HouseMatch as a <strong>Preferred Client</strong> has been approved. 
              We're excited to have ${partnerData.companyName} as part of our partner network.
            </p>
            
            <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 20px; margin: 25px 0;">
              <h3 style="margin: 0 0 10px 0; color: #2e7d32; font-size: 18px;">✓ Your Application Status: APPROVED</h3>
              <p style="margin: 0; color: #333; font-size: 15px; line-height: 1.8;">
                You're one step away from accessing premium client referrals and joining New Zealand's most trusted property services network.
              </p>
            </div>
            
            <div style="background: #f8f9fa; border: 2px solid #667eea; padding: 25px; margin: 25px 0; border-radius: 8px;">
              <h3 style="margin: 0 0 15px 0; color: #667eea; font-size: 18px;">💳 Complete Your Subscription</h3>
              <p style="margin: 0 0 15px 0; font-size: 15px; color: #333;">
                To activate your Preferred Client account, please complete your $99/month subscription payment:
              </p>
              <ul style="margin: 15px 0; padding-left: 20px; font-size: 15px; color: #333; line-height: 1.8;">
                <li><strong>Monthly Fee:</strong> $99.00 NZD</li>
                <li><strong>Benefits:</strong> Premium listing, direct client referrals, no commission fees</li>
                <li><strong>Cancellation:</strong> Cancel anytime, no lock-in contract</li>
              </ul>
              <a href="${partnerData.paymentLink}" 
                 style="display: inline-block; background: #4caf50; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 15px 0; text-align: center; font-size: 16px;">
                Complete Subscription Payment →
              </a>
              <p style="margin: 15px 0 0 0; font-size: 13px; color: #666;">
                🔒 Secure payment powered by Stripe
              </p>
            </div>
            
            <h3 style="color: #667eea; font-size: 18px; margin-top: 30px;">What Happens Next?</h3>
            <ol style="font-size: 15px; color: #333; line-height: 1.8;">
              <li>Click the button above to complete your subscription payment</li>
              <li>You'll receive your login credentials immediately after payment</li>
              <li>Access your partner portal and start receiving client referrals</li>
            </ol>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⏰ Important:</strong> This payment link expires in 24 hours. Complete your subscription now to secure your spot in our partner network.
              </p>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              Questions? Need assistance? Our team is here to help - just reply to this email.
            </p>
            
            <p style="font-size: 14px; color: #666;">
              Welcome to HouseMatch!<br>
              The HouseMatch Team
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2025 HouseMatch NZ. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${partnerData.contactName},\n\nCONGRATULATIONS! 🎉\n\nYour application to join HouseMatch as a Preferred Client has been approved. We're excited to have ${partnerData.companyName} as part of our partner network.\n\n✓ YOUR APPLICATION STATUS: APPROVED\n\nYou're one step away from accessing premium client referrals and joining New Zealand's most trusted property services network.\n\n💳 COMPLETE YOUR SUBSCRIPTION\n\nTo activate your Preferred Client account, please complete your $99/month subscription payment:\n\n• Monthly Fee: $99.00 NZD\n• Benefits: Premium listing, direct client referrals, no commission fees\n• Cancellation: Cancel anytime, no lock-in contract\n\nComplete Payment: ${partnerData.paymentLink}\n\n🔒 Secure payment powered by Stripe\n\nWHAT HAPPENS NEXT?\n\n1. Click the link above to complete your subscription payment\n2. You'll receive your login credentials immediately after payment\n3. Access your partner portal and start receiving client referrals\n\n⏰ IMPORTANT: This payment link expires in 24 hours. Complete your subscription now to secure your spot in our partner network.\n\nQuestions? Need assistance? Our team is here to help - just reply to this email.\n\nWelcome to HouseMatch!\nThe HouseMatch Team`,
    };
  }

  /**
   * Send partner rejection email
   */
  static async sendPartnerRejectionEmail(partnerData: {
    companyName: string;
    contactName: string;
    email: string;
    reason?: string;
  }): Promise<void> {
    const template = this.getPartnerRejectionTemplate(partnerData);

    // Send immediately via Gmail instead of queuing
    const result = await sendGmailEmail({
      to: partnerData.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
      fromName: FROM_NAME,
    });

    if (!result.success) {
      console.error('❌ Failed to send partner rejection email:', result.error);
      throw new Error(`Email sending failed: ${result.error}`);
    }

    console.log(`✅ Partner rejection email sent to ${partnerData.email}`);
  }

  private static getPartnerRejectionTemplate(partnerData: {
    companyName: string;
    contactName: string;
    email: string;
    reason?: string;
  }): EmailTemplate {
    const defaultReason = "After careful review of your application, we've determined that your services don't align with our current partner network requirements.";
    const rejectionReason = partnerData.reason || defaultReason;

    return {
      subject: `Update on Your HouseMatch Partner Application`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">HouseMatch NZ</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Partner Application Update</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e1e8ed; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333;">Hi ${partnerData.contactName},</p>
            
            <p style="font-size: 16px; color: #333;">Thank you for your interest in joining the HouseMatch partner network with ${partnerData.companyName}.</p>
            
            <p style="font-size: 16px; color: #333;">${rejectionReason}</p>
            
            <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0;">
              <p style="margin: 0; color: #333; font-size: 15px; line-height: 1.8;">
                We appreciate the time you took to complete your application. While we're unable to proceed at this time, we encourage you to reapply in the future as our partner network requirements evolve.
              </p>
            </div>
            
            <p style="font-size: 16px; color: #333;">
              If you have any questions or would like more information about our decision, please feel free to contact us.
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Best regards,<br>
              The HouseMatch Team
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© 2025 HouseMatch NZ. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${partnerData.contactName},\n\nThank you for your interest in joining the HouseMatch partner network with ${partnerData.companyName}.\n\n${rejectionReason}\n\nWe appreciate the time you took to complete your application. While we're unable to proceed at this time, we encourage you to reapply in the future as our partner network requirements evolve.\n\nIf you have any questions or would like more information about our decision, please feel free to contact us.\n\nBest regards,\nThe HouseMatch Team`,
    };
  }

  /**
   * Utility: Convert HTML to plain text
   */
  private static htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
