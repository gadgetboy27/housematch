/**
 * Universal Payment System Utilities
 * 
 * This module provides reusable utilities for initiating payments across the entire app.
 * All purchase flows should use this system for consistency and security.
 */

export interface PaymentItem {
  name: string;
  description?: string;
  price: number; // In cents
  planId: string;
  planType?: 'listing' | 'storage' | 'report' | 'service';
  metadata?: Record<string, any>;
}

/**
 * Format price from cents to display format
 */
export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
}

/**
 * Validate payment item before processing
 */
export function validatePaymentItem(item: PaymentItem): boolean {
  if (!item.name || item.name.trim() === '') {
    console.error('Payment item must have a name');
    return false;
  }
  
  if (!item.planId || item.planId.trim() === '') {
    console.error('Payment item must have a planId');
    return false;
  }
  
  if (item.price < 0) {
    console.error('Payment item price must be positive');
    return false;
  }
  
  return true;
}
