import Anthropic from '@anthropic-ai/sdk';
import { db } from './db';
import { sentryErrors, errorAnalysis, errorFixes } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { sendGmailEmail, isGmailConfigured } from './services/gmail-transport';

// Initialize Anthropic for AI analysis
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Admin email for notifications
const ADMIN_EMAIL = 'admin@swiperight.nz';

/**
 * Process incoming Sentry webhook and analyze with AI
 */
export async function processSentryWebhook(payload: any) {
  try {
    const data = payload.data;
    
    // Check if error already exists
    const existingError = await db
      .select()
      .from(sentryErrors)
      .where(eq(sentryErrors.sentryEventId, data.event?.event_id || data.id))
      .limit(1);

    let errorRecord;
    
    if (existingError.length > 0) {
      // Update existing error
      errorRecord = existingError[0];
      await db
        .update(sentryErrors)
        .set({
          eventCount: (errorRecord.eventCount || 1) + 1,
          lastSeen: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(sentryErrors.id, errorRecord.id));
    } else {
      // Create new error record
      const [newError] = await db
        .insert(sentryErrors)
        .values({
          sentryEventId: data.event?.event_id || data.id,
          issueId: data.id,
          level: data.level || 'error',
          message: data.message || data.title || 'Unknown error',
          culprit: data.culprit,
          platform: data.platform || 'javascript',
          environment: data.event?.environment || 'production',
          stackTrace: data.event?.exception?.values || data.event?.stacktrace,
          tags: data.event?.tags || {},
          context: data.event?.contexts || {},
          user: data.event?.user,
          request: data.event?.request,
          firstSeen: new Date(data.firstSeen || Date.now()),
          lastSeen: new Date(data.lastSeen || Date.now()),
          url: data.url,
        })
        .returning();
      
      errorRecord = newError;
    }

    // Only analyze new errors or errors that haven't been analyzed
    if (!errorRecord.analyzed) {
      await analyzeErrorWithAI(errorRecord.id, errorRecord);
    }

    return errorRecord;
  } catch (error) {
    console.error('Error processing Sentry webhook:', error);
    throw error;
  }
}

/**
 * Analyze error with Claude AI and suggest fixes
 */
async function analyzeErrorWithAI(errorId: string, errorData: any) {
  try {
    console.log(`🤖 Analyzing error ${errorId} with AI...`);

    // Prepare error context for AI
    const errorContext = `
Error Analysis Request:

**Error Message:** ${errorData.message}
**Level:** ${errorData.level}
**Environment:** ${errorData.environment}
**Platform:** ${errorData.platform}
**Location:** ${errorData.culprit || 'Unknown'}

**Stack Trace:**
${JSON.stringify(errorData.stackTrace, null, 2)}

**Request Context:**
${JSON.stringify(errorData.request, null, 2)}

**User Info:**
${JSON.stringify(errorData.user, null, 2)}

**Tags:**
${JSON.stringify(errorData.tags, null, 2)}

**Additional Context:**
${JSON.stringify(errorData.context, null, 2)}

Please analyze this error and provide:
1. Root cause analysis
2. Business impact assessment (critical/high/medium/low)
3. Estimated number of affected users
4. Suggested fix with confidence score (0-1)
5. Fix type (simple/moderate/complex)
6. Estimated fix time in minutes
7. Test suggestions
8. Related files that may need changes
`;

    // Call Claude for analysis
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: errorContext,
      }],
    });

    const aiResponse = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse AI response (simplified - in production you'd want structured output)
    const analysis = {
      analysis: aiResponse,
      rootCause: extractRootCause(aiResponse),
      businessImpact: extractBusinessImpact(aiResponse),
      affectedUsers: extractAffectedUsers(aiResponse),
      suggestedFix: extractSuggestedFix(aiResponse),
      fixConfidence: extractConfidence(aiResponse),
      fixType: extractFixType(aiResponse),
      estimatedFixTime: extractEstimatedTime(aiResponse),
      relatedFiles: extractRelatedFiles(aiResponse),
      testSuggestions: extractTestSuggestions(aiResponse),
    };

    // Save analysis to database
    const [analysisRecord] = await db
      .insert(errorAnalysis)
      .values({
        errorId,
        aiModel: 'claude-sonnet-4-20250514',
        ...analysis,
      })
      .returning();

    // Mark error as analyzed
    await db
      .update(sentryErrors)
      .set({
        analyzed: true,
        severity: getSeverity(analysis.businessImpact),
        category: getCategory(analysis.fixType),
        updatedAt: new Date(),
      })
      .where(eq(sentryErrors.id, errorId));

    // Send email notification if critical
    if (analysis.businessImpact === 'critical' || analysis.businessImpact === 'high') {
      await sendErrorNotification(errorData, analysis);
    }

    console.log(`✅ Error ${errorId} analyzed successfully`);
    return analysisRecord;
  } catch (error) {
    console.error('Error analyzing with AI:', error);
    // Don't throw - we don't want to fail the webhook if AI analysis fails
    return null;
  }
}

/**
 * Helper functions to parse AI response
 */
function extractRootCause(text: string): string {
  const match = text.match(/root cause[:\s]+(.+?)(?:\n|$)/i);
  return match ? match[1].trim() : 'Unknown';
}

function extractBusinessImpact(text: string): string {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('critical')) return 'critical';
  if (lowerText.includes('high')) return 'high';
  if (lowerText.includes('medium')) return 'medium';
  return 'low';
}

function extractAffectedUsers(text: string): number {
  const match = text.match(/(\d+)\s*(?:users?|affected)/i);
  return match ? parseInt(match[1]) : 1;
}

function extractSuggestedFix(text: string): string {
  const match = text.match(/suggested? fix[:\s]+(.+?)(?:\n\n|$)/is);
  return match ? match[1].trim() : 'No specific fix suggested';
}

function extractConfidence(text: string): string {
  const match = text.match(/confidence[:\s]+([\d.]+)/i);
  return match ? match[1] : '0.5';
}

function extractFixType(text: string): string {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('simple') || lowerText.includes('easy')) return 'simple';
  if (lowerText.includes('complex') || lowerText.includes('difficult')) return 'complex';
  return 'moderate';
}

function extractEstimatedTime(text: string): number {
  const match = text.match(/(\d+)\s*(?:minutes?|mins?)/i);
  return match ? parseInt(match[1]) : 30;
}

function extractRelatedFiles(text: string): string[] {
  const match = text.match(/related files?[:\s]+(.+?)(?:\n\n|$)/is);
  if (!match) return [];
  return match[1].split(/[,\n]/).map(f => f.trim()).filter(Boolean);
}

function extractTestSuggestions(text: string): string {
  const match = text.match(/test(?:ing)? suggestions?[:\s]+(.+?)(?:\n\n|$)/is);
  return match ? match[1].trim() : 'Test the affected functionality';
}

function getSeverity(businessImpact: string): string {
  switch (businessImpact) {
    case 'critical': return 'critical';
    case 'high': return 'high';
    case 'medium': return 'medium';
    default: return 'low';
  }
}

function getCategory(fixType: string): string {
  switch (fixType) {
    case 'simple': return 'auto-fixable';
    case 'moderate': return 'needs-review';
    default: return 'complex';
  }
}

/**
 * Send email notification for critical errors
 */
async function sendErrorNotification(errorData: any, analysis: any) {
  if (!isGmailConfigured()) {
    console.log('📧 Gmail not configured, skipping email notification');
    return;
  }

  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">🚨 Critical Error Detected</h2>
        
        <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 12px; margin: 16px 0;">
          <strong>Error:</strong> ${errorData.message}
        </div>
        
        <h3>📊 AI Analysis</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Business Impact:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${analysis.businessImpact}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Affected Users:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${analysis.affectedUsers}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Fix Type:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${analysis.fixType}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Estimated Fix Time:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${analysis.estimatedFixTime} minutes</td>
          </tr>
        </table>
        
        <h3>🔍 Root Cause</h3>
        <p style="background: #f3f4f6; padding: 12px; border-radius: 6px;">
          ${analysis.rootCause}
        </p>
        
        <h3>💡 Suggested Fix</h3>
        <p style="background: #f3f4f6; padding: 12px; border-radius: 6px;">
          ${analysis.suggestedFix}
        </p>
        
        <div style="margin-top: 24px; padding: 12px; background: #f9fafb; border-radius: 6px;">
          <p style="margin: 0;"><strong>View in Sentry:</strong> <a href="${errorData.url}">${errorData.url}</a></p>
        </div>
      </div>
    `;

    const result = await sendGmailEmail({
      to: ADMIN_EMAIL,
      subject: `🚨 Critical Error: ${errorData.message}`,
      html: htmlContent,
      fromName: 'HouseMatch NZ - Error Monitoring',
    });

    if (result.success) {
      console.log(`📧 Critical error notification sent to ${ADMIN_EMAIL}`);
    } else {
      console.error('Error sending email notification:', result.error);
    }
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}

/**
 * Get all errors for admin dashboard
 */
export async function getAllErrors(limit = 50) {
  return await db
    .select()
    .from(sentryErrors)
    .orderBy(desc(sentryErrors.lastSeen))
    .limit(limit);
}

/**
 * Get error with analysis
 */
export async function getErrorWithAnalysis(errorId: string) {
  const error = await db
    .select()
    .from(sentryErrors)
    .where(eq(sentryErrors.id, errorId))
    .limit(1);

  if (error.length === 0) return null;

  const analysis = await db
    .select()
    .from(errorAnalysis)
    .where(eq(errorAnalysis.errorId, errorId))
    .limit(1);

  const fixes = await db
    .select()
    .from(errorFixes)
    .where(eq(errorFixes.errorId, errorId));

  return {
    error: error[0],
    analysis: analysis[0] || null,
    fixes,
  };
}
