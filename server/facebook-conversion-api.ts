import crypto from 'crypto';
import axios from 'axios';
import type { Request } from 'express';

const FB_PIXEL_ID = process.env.FB_PIXEL_ID;
const FB_CONVERSION_API_TOKEN = process.env.FB_CONVERSION_API_TOKEN;
const GRAPH_API_VERSION = 'v19.0';

const ENABLED = !!(FB_PIXEL_ID && FB_CONVERSION_API_TOKEN);

// Hash user data with SHA-256 as required by Facebook
function hashData(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function getClientInfo(req: Request) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || '';
  const userAgent = req.headers['user-agent'] || '';
  const fbc = (req as any).cookies?.['_fbc'] || '';
  const fbp = (req as any).cookies?.['_fbp'] || '';
  return { ip, userAgent, fbc, fbp };
}

interface UserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  country?: string;
}

async function sendEvent(
  eventName: string,
  userData: UserData,
  customData: Record<string, any>,
  req: Request,
  eventId?: string,
) {
  if (!ENABLED) {
    console.log(`📊 FB CAPI (disabled — env vars not set): ${eventName}`);
    return;
  }

  const { ip, userAgent, fbc, fbp } = getClientInfo(req);

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId || crypto.randomUUID(),
        action_source: 'website',
        event_source_url: req.headers.referer || `https://housematch.co.nz`,
        user_data: {
          ...(userData.email && { em: hashData(userData.email) }),
          ...(userData.phone && { ph: hashData(userData.phone.replace(/\D/g, '')) }),
          ...(userData.firstName && { fn: hashData(userData.firstName) }),
          ...(userData.lastName && { ln: hashData(userData.lastName) }),
          ...(userData.city && { ct: hashData(userData.city) }),
          ...(userData.country && { country: hashData(userData.country) }),
          client_ip_address: ip,
          client_user_agent: userAgent,
          ...(fbc && { fbc }),
          ...(fbp && { fbp }),
        },
        custom_data: customData,
      },
    ],
    // NOTE: Set test_event_code from Facebook Events Manager when testing
    // test_event_code: 'TEST12345',
  };

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${FB_PIXEL_ID}/events`;
    const response = await axios.post(url, payload, {
      params: { access_token: FB_CONVERSION_API_TOKEN },
      timeout: 5000,
    });
    console.log(`✅ FB CAPI: ${eventName} tracked (events_received: ${response.data?.events_received ?? '?'})`);
  } catch (err: any) {
    // Non-blocking — never crash the request because of analytics
    console.error(`⚠️ FB CAPI error for ${eventName}:`, err?.response?.data || err.message);
  }
}

// ─── Public API ───────────────────────────────────────────────────

/** Track a new user registration (CompleteRegistration) */
export async function trackSignup(userData: UserData, req: Request) {
  await sendEvent('CompleteRegistration', userData, {
    content_name: 'User Signup',
    status: true,
    currency: 'NZD',
    value: 0,
  }, req);
}

/** Track a lead — express interest or offer submission */
export async function trackLead(
  userData: UserData,
  property: { id: string; price?: string; suburb?: string },
  req: Request,
  value: number = 15,
) {
  await sendEvent('Lead', userData, {
    content_ids: [property.id],
    content_category: 'Property Inquiry',
    value,
    currency: 'NZD',
    ...(property.suburb && { content_name: property.suburb }),
  }, req);
}

/** Track a property view (ViewContent) */
export async function trackPropertyView(
  userData: UserData,
  property: { id: string; price?: string; suburb?: string; type?: string },
  req: Request,
) {
  await sendEvent('ViewContent', userData, {
    content_ids: [property.id],
    content_type: 'property',
    content_category: property.type || 'Property',
    value: parseFloat(property.price?.replace(/[^0-9.]/g, '') || '0') || 0,
    currency: 'NZD',
    ...(property.suburb && { content_name: property.suburb }),
  }, req);
}

/** Track a purchase (report, subscription) */
export async function trackPurchase(
  userData: UserData,
  purchaseData: { value: number; contentName?: string; orderId?: string },
  req: Request,
) {
  await sendEvent('Purchase', userData, {
    value: purchaseData.value,
    currency: 'NZD',
    content_name: purchaseData.contentName || 'Purchase',
    ...(purchaseData.orderId && { order_id: purchaseData.orderId }),
  }, req);
}
