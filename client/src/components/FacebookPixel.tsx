import { useEffect } from 'react';
import { useLocation } from 'wouter';

const FB_PIXEL_ID = import.meta.env.VITE_FB_PIXEL_ID as string | undefined;

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

// Initialize Facebook Pixel once on load
function initPixel(pixelId: string) {
  if (typeof window === 'undefined' || window.fbq) return;

  const fbq: any = function (...args: any[]) {
    (fbq.q = fbq.q || []).push(args);
  };
  fbq.q = [];
  fbq.version = '2.0';
  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);

  fbq('init', pixelId);
}

export function FacebookPixel() {
  const [location] = useLocation();

  useEffect(() => {
    if (!FB_PIXEL_ID) {
      console.warn('⚠️ Facebook Pixel: VITE_FB_PIXEL_ID is not set');
      return;
    }
    initPixel(FB_PIXEL_ID);
    window.fbq?.('track', 'PageView');
  }, []);

  useEffect(() => {
    if (!FB_PIXEL_ID) return;
    window.fbq?.('track', 'PageView');
  }, [location]);

  return null;
}

// ─── Event Helpers ───────────────────────────────────────────────

/** Track when a user views a property listing */
export function fbTrackViewContent(property: {
  id: string;
  address: string;
  suburb?: string;
  price?: string;
  bedrooms?: number;
  propertyType?: string;
}) {
  if (!window.fbq) return;
  window.fbq('track', 'ViewContent', {
    content_ids: [property.id],
    content_name: property.address,
    content_category: property.propertyType || 'Property',
    content_type: 'property',
    value: parseFloat(property.price?.replace(/[^0-9.]/g, '') || '0') || undefined,
    currency: 'NZD',
  });
}

/** Track when a user likes/saves a property (signals buying intent) */
export function fbTrackAddToWishlist(property: {
  id: string;
  address: string;
  price?: string;
  propertyType?: string;
}) {
  if (!window.fbq) return;
  window.fbq('track', 'AddToWishlist', {
    content_ids: [property.id],
    content_name: property.address,
    content_category: property.propertyType || 'Property',
    content_type: 'property',
    value: parseFloat(property.price?.replace(/[^0-9.]/g, '') || '0') || undefined,
    currency: 'NZD',
  });
}

/** Track a lead — express interest, inquiry, or offer submission */
export function fbTrackLead(property: {
  id: string;
  address: string;
  price?: string;
  suburb?: string;
}) {
  if (!window.fbq) return;
  window.fbq('track', 'Lead', {
    content_ids: [property.id],
    content_name: property.address,
    content_category: 'Property Inquiry',
    value: parseFloat(property.price?.replace(/[^0-9.]/g, '') || '0') || undefined,
    currency: 'NZD',
  });
}

/** Track a completed registration / signup */
export function fbTrackCompleteRegistration(method: string = 'Email') {
  if (!window.fbq) return;
  window.fbq('track', 'CompleteRegistration', {
    status: true,
    content_name: method,
  });
}

/** Track a purchase (report, subscription, etc.) */
export function fbTrackPurchase(value: number, currency: string = 'NZD', contentName?: string) {
  if (!window.fbq) return;
  window.fbq('track', 'Purchase', {
    value,
    currency,
    content_name: contentName,
  });
}

/** Track a search event */
export function fbTrackSearch(searchTerm: string) {
  if (!window.fbq) return;
  window.fbq('track', 'Search', {
    search_string: searchTerm,
    content_category: 'Property Search',
  });
}
