import { useEffect } from 'react';
import { useLocation } from 'wouter';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export function GoogleAnalytics() {
  const [location] = useLocation();
  
  const GA_TRACKING_ID = 'G-KX9262Q264';

  // Initialize gtag on mount (replaces inline script that CSP blocked)
  useEffect(() => {
    // Initialize dataLayer and gtag function
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer?.push(arguments);
    };
    
    // Send initial config
    window.gtag('js', new Date());
    window.gtag('config', GA_TRACKING_ID);
  }, []);

  // Track page views when location changes
  useEffect(() => {
    if (window.gtag) {
      window.gtag('config', GA_TRACKING_ID, {
        page_path: location,
      });
    }
  }, [location]);

  return null;
}

// Event tracking helper functions
export const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
};

// Pre-defined tracking events for common actions
export const trackPropertyView = (propertyId: string, propertyAddress: string) => {
  trackEvent('property_view', {
    property_id: propertyId,
    property_address: propertyAddress,
  });
};

export const trackPropertyLike = (propertyId: string) => {
  trackEvent('property_like', {
    property_id: propertyId,
  });
};

export const trackReportPurchase = (reportType: string, price: number) => {
  trackEvent('purchase', {
    transaction_id: Date.now().toString(),
    value: price / 100, // Convert cents to dollars
    currency: 'NZD',
    items: [{
      item_name: reportType,
      price: price / 100,
      quantity: 1,
    }],
  });
};

export const trackPremiumUpgrade = (planName: string, price: number) => {
  trackEvent('purchase', {
    transaction_id: Date.now().toString(),
    value: price / 100,
    currency: 'NZD',
    items: [{
      item_name: planName,
      price: price / 100,
      quantity: 1,
    }],
  });
};

export const trackSearch = (searchTerm: string) => {
  trackEvent('search', {
    search_term: searchTerm,
  });
};

export const trackOfferSubmission = (propertyId: string, offerType: string) => {
  trackEvent('offer_submission', {
    property_id: propertyId,
    offer_type: offerType,
  });
};

// Custom hook to track page views with additional metadata
export const usePageTracking = (pageName: string, metadata?: Record<string, any>) => {
  useEffect(() => {
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: pageName,
        page_location: window.location.href,
        page_path: window.location.pathname,
        ...metadata,
      });
      
      console.log(`📊 GA: Tracked page view - ${pageName}`, metadata);
    }
  }, [pageName, metadata]);
};

// Hook to track button clicks
export const useTrackClick = () => {
  return (eventName: string, properties?: Record<string, any>) => {
    trackEvent(eventName, properties);
    console.log(`📊 GA: Tracked event - ${eventName}`, properties);
  };
};

// Hook to track form submissions
export const useTrackForm = () => {
  return (formName: string, success: boolean, errorMessage?: string) => {
    trackEvent('form_submission', {
      form_name: formName,
      success: success,
      error_message: errorMessage,
    });
    console.log(`📊 GA: Tracked form - ${formName}`, { success, errorMessage });
  };
};
