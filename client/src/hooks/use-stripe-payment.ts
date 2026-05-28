import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PaymentItem {
  name: string;
  description?: string;
  price: number;
  planId: string;
  planType?: 'listing' | 'storage' | 'report' | 'service';
  metadata?: Record<string, any>;
}

// Helper function to sanitize data and remove circular references
function sanitizeData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  // If it's not an object or is a Date, return as-is
  if (typeof data !== 'object' || data instanceof Date) {
    return data;
  }

  // If it's an array, sanitize each element
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  // For objects, create a clean copy with only serializable properties
  const cleanObj: any = {};
  
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      
      // Skip functions, DOM elements, and other non-serializable objects
      if (typeof value === 'function') continue;
      if (value instanceof HTMLElement) continue;
      if (value instanceof Window) continue;
      if (value instanceof Event) continue;
      
      // Try to serialize and skip if it fails
      try {
        JSON.stringify(value);
        cleanObj[key] = sanitizeData(value);
      } catch (err) {
        // Skip properties that can't be serialized
        console.log(`⚠️ Skipping non-serializable property: ${key}`);
      }
    }
  }
  
  return cleanObj;
}

export function useStripePayment() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentItem, setCurrentItem] = useState<PaymentItem | null>(null);
  const { toast } = useToast();

  const initiatePayment = (item: PaymentItem) => {
    console.log('💳 Payment initiated for:', item);
    setCurrentItem(item);
    setShowConfirmation(true);
  };

  const processPayment = async (propertyData?: any) => {
    if (!currentItem) {
      console.error('❌ No payment item selected');
      return;
    }

    setIsProcessing(true);
    console.log('💰 Processing payment for:', currentItem.name);

    // Sanitize propertyData to remove circular references
    const cleanPropertyData = propertyData ? sanitizeData(propertyData) : undefined;

    const requestPayload = {
      planId: currentItem.planId,
      planType: currentItem.planType || 'listing',
      propertyData: cleanPropertyData,
      metadata: currentItem.metadata,
    };
    
    // Safe logging that handles circular references
    try {
      console.log('📤 Request payload being sent to backend:', {
        planId: requestPayload.planId,
        planType: requestPayload.planType,
        hasPropertyData: !!requestPayload.propertyData,
        metadata: requestPayload.metadata
      });
    } catch (err) {
      console.log('📤 Request payload prepared (contains complex objects)');
    }

    try {
      // Call Stripe checkout API
      const response = await apiRequest("POST", "/api/stripe/create-checkout-session", requestPayload);

      const data = await response.json();
      console.log('✅ Stripe session created:', data);

      if (data.url) {
        // Show loading message before redirect
        console.log('🔄 Redirecting to Stripe checkout...');
        
        // Create a full-screen loading overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(255, 255, 255, 0.95);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          font-family: system-ui, -apple-system, sans-serif;
        `;
        
        overlay.innerHTML = `
          <div style="text-align: center;">
            <div style="
              width: 50px;
              height: 50px;
              border: 4px solid #f3f3f3;
              border-top: 4px solid #3498db;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            "></div>
            <p style="font-size: 18px; font-weight: 500; color: #333; margin: 0;">
              Redirecting to secure payment...
            </p>
            <p style="font-size: 14px; color: #666; margin-top: 8px;">
              Please wait
            </p>
          </div>
          <style>
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        `;
        
        document.body.appendChild(overlay);
        
        // Redirect after a brief moment to ensure overlay is visible
        setTimeout(() => {
          window.location.href = data.url;
        }, 300);
      } else {
        throw new Error('No checkout URL received from server');
      }
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
      
      setIsProcessing(false);
      setShowConfirmation(false);
    }
  };

  const cancelPayment = () => {
    console.log('❌ Payment cancelled by user');
    setShowConfirmation(false);
    setCurrentItem(null);
    setIsProcessing(false);
  };

  return {
    initiatePayment,
    processPayment,
    cancelPayment,
    isProcessing,
    showConfirmation,
    currentItem,
  };
}
