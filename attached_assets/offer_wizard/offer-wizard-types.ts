// HouseMatch Offer Wizard Type Definitions
// TypeScript types for complete type safety

// ============================================================================
// DATABASE ENTITY TYPES
// ============================================================================

export type OfferStatus = 
  | 'draft'           // User is filling out the wizard
  | 'pending'         // Submitted, awaiting vendor response
  | 'accepted'        // Vendor accepted
  | 'rejected'        // Vendor rejected
  | 'conditional'     // Accepted but subject to conditions
  | 'unconditional'   // All conditions met
  | 'withdrawn'       // Buyer withdrew
  | 'cancelled'       // Cancelled by system/admin
  | 'settled';        // Successfully completed

export type ConditionType =
  | 'finance'
  | 'lim_report'
  | 'building_inspection'
  | 'title_search'
  | 'valuation'
  | 'insurance'
  | 'sale_of_buyers_property'
  | 'custom';

export type ConditionStatus = 
  | 'pending'     // Awaiting fulfillment
  | 'satisfied'   // Condition met
  | 'waived'      // Buyer waived condition
  | 'failed';     // Condition not met (offer fails)

export type ChattelType = 'included' | 'excluded';

export interface Property {
  id: string;
  address: string;
  legal_description: string | null;
  current_listing_price: number;
  vendor_id: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  property_id: string;
  buyer_id: string;
  offer_price: number;
  deposit_amount: number;
  deposit_payment_date: string;
  settlement_date: string;
  status: OfferStatus;
  wizard_step: number;
  wizard_completed: boolean;
  adls_form_purchased: boolean;
  adls_form_purchase_date: string | null;
  adls_form_cost: number;
  pdf_generated: boolean;
  pdf_url: string | null;
  docusign_envelope_id: string | null;
  docusign_status: string | null;
  signed_by_buyer_at: string | null;
  signed_by_vendor_at: string | null;
  submitted_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfferBuyerDetails {
  id: string;
  offer_id: string;
  has_solicitor: boolean;
  solicitor_name: string | null;
  solicitor_firm: string | null;
  solicitor_email: string | null;
  solicitor_phone: string | null;
  solicitor_address: string | null;
  buyer_occupation: string | null;
  buyer_id_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfferCondition {
  id: string;
  offer_id: string;
  condition_type: ConditionType;
  description: string;
  days_to_satisfy: number;
  due_date: string;
  status: ConditionStatus;
  documents: Array<{
    name: string;
    url: string;
    uploaded_at: string;
  }>;
  notes: string | null;
  satisfied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfferChattel {
  id: string;
  offer_id: string;
  chattel_type: ChattelType;
  item_description: string;
  quantity: number;
  is_standard: boolean;
  created_at: string;
  updated_at: string;
}

export interface StandardChattel {
  id: string;
  category: string;
  description: string;
  typically_included: boolean;
  display_order: number;
}

export interface OfferActivity {
  id: string;
  offer_id: string;
  activity_type: string;
  description: string;
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
}

export interface OfferMessage {
  id: string;
  offer_id: string;
  sender_id: string;
  message_text: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// View type (combines multiple tables)
export interface OfferDetails extends Offer {
  property_address: string;
  legal_description: string | null;
  current_listing_price: number;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  solicitor_name: string | null;
  solicitor_firm: string | null;
  solicitor_email: string | null;
  pending_conditions: number;
  satisfied_conditions: number;
}

export interface CompleteOffer extends OfferDetails {
  conditions: OfferCondition[];
  chattels: OfferChattel[];
  buyerDetails: OfferBuyerDetails | null;
  recentActivities: OfferActivity[];
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

// POST /api/offers
export interface CreateOfferRequest {
  propertyId: string;
  offerPrice: number;
  depositAmount?: number; // Optional, defaults to 10% of offer price
  settlementDate: string; // ISO date string
}

export interface CreateOfferResponse {
  success: boolean;
  offer: Offer;
}

// GET /api/offers
export interface GetOffersQuery {
  status?: OfferStatus;
  propertyId?: string;
}

export interface GetOffersResponse {
  success: boolean;
  offers: OfferDetails[];
  count: number;
}

// GET /api/offers/:offerId
export interface GetOfferResponse {
  success: boolean;
  offer: CompleteOffer;
}

// PATCH /api/offers/:offerId
export interface UpdateOfferRequest {
  offer_price?: number;
  deposit_amount?: number;
  settlement_date?: string;
  wizard_step?: number;
}

export interface UpdateOfferResponse {
  success: boolean;
  offer: Offer;
}

// POST /api/offers/:offerId/buyer-details
export interface SaveBuyerDetailsRequest {
  hasSolicitor: boolean;
  solicitorName?: string;
  solicitorFirm?: string;
  solicitorEmail?: string;
  solicitorPhone?: string;
  solicitorAddress?: string;
}

export interface SaveBuyerDetailsResponse {
  success: boolean;
  buyerDetails: OfferBuyerDetails;
}

// POST /api/offers/:offerId/conditions
export interface AddConditionsRequest {
  conditions: Array<{
    conditionType: ConditionType;
    description: string;
    daysToSatisfy?: number; // Defaults to 10
  }>;
}

export interface AddConditionsResponse {
  success: boolean;
  conditions: OfferCondition[];
}

// PATCH /api/offers/:offerId/conditions/:conditionId
export interface UpdateConditionRequest {
  status?: ConditionStatus;
  notes?: string;
  documents?: Array<{
    name: string;
    url: string;
    uploaded_at: string;
  }>;
}

export interface UpdateConditionResponse {
  success: boolean;
  condition: OfferCondition;
}

// GET /api/standard-chattels
export interface GetStandardChattelsResponse {
  success: boolean;
  chattels: Record<string, StandardChattel[]>; // Grouped by category
}

// POST /api/offers/:offerId/chattels
export interface AddChattelsRequest {
  included: string[];
  excluded: string[];
}

export interface AddChattelsResponse {
  success: boolean;
  chattels: OfferChattel[];
}

// POST /api/offers/:offerId/submit
export interface SubmitOfferResponse {
  success: boolean;
  message: string;
  offer: Offer;
  nextSteps: string[];
}

// POST /api/offers/:offerId/sign
export interface InitiateSigningResponse {
  success: boolean;
  message: string;
  signingUrl: string;
  envelopeId?: string;
}

// GET /api/offers/:offerId/activities
export interface GetActivitiesResponse {
  success: boolean;
  activities: Array<OfferActivity & { created_by_name: string | null }>;
}

// POST /api/offers/:offerId/messages
export interface SendMessageRequest {
  messageText: string;
}

export interface SendMessageResponse {
  success: boolean;
  message: OfferMessage;
}

// GET /api/offers/:offerId/messages
export interface GetMessagesResponse {
  success: boolean;
  messages: Array<OfferMessage & { sender_name: string }>;
}

// GET /api/properties/:propertyId/offers (vendor view)
export interface GetPropertyOffersResponse {
  success: boolean;
  offers: OfferDetails[];
  count: number;
}

// PATCH /api/offers/:offerId/respond (vendor response)
export interface RespondToOfferRequest {
  response: 'accepted' | 'rejected';
  counterOfferPrice?: number;
  message?: string;
}

export interface RespondToOfferResponse {
  success: boolean;
  message: string;
  offer: Offer;
}

// ============================================================================
// WIZARD STEP DATA TYPES
// ============================================================================

export interface WizardStep1Data {
  propertyId: string;
  offerPrice: number;
  depositAmount: number;
  settlementDate: string;
}

export interface WizardStep2Data {
  hasSolicitor: boolean;
  solicitorName?: string;
  solicitorFirm?: string;
  solicitorEmail?: string;
  solicitorPhone?: string;
  solicitorAddress?: string;
}

export interface WizardStep3Data {
  conditions: Array<{
    conditionType: ConditionType;
    description: string;
    daysToSatisfy: number;
  }>;
}

export interface WizardStep4Data {
  included: string[];
  excluded: string[];
}

export interface CompleteWizardData {
  step1: WizardStep1Data;
  step2: WizardStep2Data;
  step3: WizardStep3Data;
  step4: WizardStep4Data;
}

// ============================================================================
// FORM VALIDATION TYPES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface ADLSFormPurchase {
  offerId: string;
  cost: number;
  purchaseDate: string;
  transactionId: string;
}

export interface PDFGenerationResult {
  success: boolean;
  pdfUrl: string | null;
  error?: string;
}

export interface SigningEnvelope {
  envelopeId: string;
  status: 'created' | 'sent' | 'delivered' | 'signed' | 'completed' | 'declined' | 'voided';
  signingUrl: string;
  expiresAt: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface APIError {
  error: string;
  details?: string;
  code?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const WIZARD_STEPS = {
  PROPERTY_DETAILS: 1,
  BUYER_DETAILS: 2,
  CONDITIONS: 3,
  CHATTELS: 4,
  REVIEW_SUBMIT: 5,
} as const;

export const DEFAULT_DEPOSIT_PERCENTAGE = 0.1; // 10%
export const DEFAULT_CONDITION_DAYS = 10;
export const ADLS_FORM_COST = 136.85;

export const STANDARD_CONDITIONS = {
  FINANCE: {
    type: 'finance' as ConditionType,
    description: 'Subject to buyer obtaining finance approval',
    defaultDays: 10,
  },
  LIM: {
    type: 'lim_report' as ConditionType,
    description: 'Subject to buyer obtaining and being satisfied with LIM report',
    defaultDays: 10,
  },
  BUILDING_INSPECTION: {
    type: 'building_inspection' as ConditionType,
    description: 'Subject to buyer obtaining and being satisfied with building inspection report',
    defaultDays: 10,
  },
  TITLE_SEARCH: {
    type: 'title_search' as ConditionType,
    description: 'Subject to buyer obtaining and being satisfied with title search',
    defaultDays: 5,
  },
  VALUATION: {
    type: 'valuation' as ConditionType,
    description: 'Subject to buyer obtaining satisfactory valuation report',
    defaultDays: 10,
  },
} as const;

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
