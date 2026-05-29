import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest, apiRequestJson, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { Calendar, Check, ChevronLeft, ChevronRight, FileText, Home, Scale, ShoppingCart, User } from 'lucide-react';

// PHASE 1: Simplified ADLS Offer Form (20-30 fields total)

// Step 0: Your Details (Buyer Contact Information)
const yourDetailsSchema = z.object({
  buyerFullName: z.string().min(1, 'Full name is required'),
  buyerPhone: z.string().min(1, 'Phone number is required'),
  buyerEmail: z.string().email('Valid email is required'),
  buyerAddress: z.string().min(1, 'Address is required'),
  buyingEntityType: z.enum(['individual', 'trust', 'company']),
  trustOrCompanyName: z.string().optional(),
}).superRefine((data, ctx) => {
  // Require trust/company name if buying as trust or company
  if ((data.buyingEntityType === 'trust' || data.buyingEntityType === 'company') && !data.trustOrCompanyName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${data.buyingEntityType === 'trust' ? 'Trust' : 'Company'} name is required`,
      path: ['trustOrCompanyName'],
    });
  }
});

// Step 1: Property & Offer Details (with confirmation + required toggles)
const offerDetailsSchema = z.object({
  // Property confirmation
  propertyAddress: z.string().min(1, 'Please confirm the property address'),
  propertyTitleReference: z.string().optional(),
  propertyLegalDescription: z.string().optional(),
  propertyType: z.enum(['freehold', 'leasehold', 'cross_lease', 'unit_title']),
  
  // Offer amounts (stored as strings for form input, converted to decimals on backend)
  offerPrice: z.string().min(1, 'Offer price is required'),
  depositAmount: z.string().min(1, 'Deposit amount is required'),
  depositPaymentDate: z.string().min(1, 'Deposit payment date is required'),
  balancePayable: z.string().optional(), // Calculated: offerPrice - depositAmount
  balancePayableDate: z.string().optional(), // Typically same as settlementDate
  settlementDate: z.string().min(1, 'Settlement date is required'),
  
  // Required conditions as Y/N toggles (defaults to false to avoid tri-state)
  financeRequired: z.boolean().default(false),
  financeAmount: z.string().optional(),
  financeDeadline: z.string().optional(),
  limRequired: z.boolean().default(false),
  limDeadline: z.string().optional(),
  buildingInspectionRequired: z.boolean().default(false),
  buildingInspectionDeadline: z.string().optional(),
  methTestRequired: z.boolean().default(false),
  methTestDeadline: z.string().optional(),
}).superRefine((data, ctx) => {
  // AUTO-CALCULATE balance payable (ADLS requirement)
  // This ensures we always capture the balance for ADLS compliance
  if (data.offerPrice && data.depositAmount) {
    const offerAmount = parseFloat(data.offerPrice.replace(/[^0-9.-]+/g, ''));
    const depositAmountNum = parseFloat(data.depositAmount.replace(/[^0-9.-]+/g, ''));
    if (!isNaN(offerAmount) && !isNaN(depositAmountNum)) {
      // Calculate and set balance payable (will be persisted)
      (data as any).balancePayable = (offerAmount - depositAmountNum).toString();
      // Default balance payable date to settlement date
      if (!data.balancePayableDate && data.settlementDate) {
        (data as any).balancePayableDate = data.settlementDate;
      }
    }
  }
  
  // If finance required, amount and deadline are mandatory
  if (data.financeRequired) {
    if (!data.financeAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Finance amount is required when finance is needed',
        path: ['financeAmount'],
      });
    }
    if (!data.financeDeadline) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Finance deadline is required when finance is needed',
        path: ['financeDeadline'],
      });
    }
  }
  
  // Require deadlines for each enabled condition
  if (data.limRequired && !data.limDeadline) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'LIM report deadline is required',
      path: ['limDeadline'],
    });
  }
  if (data.buildingInspectionRequired && !data.buildingInspectionDeadline) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Building inspection deadline is required',
      path: ['buildingInspectionDeadline'],
    });
  }
  if (data.methTestRequired && !data.methTestDeadline) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Meth test deadline is required',
      path: ['methTestDeadline'],
    });
  }
});

// Step 2: Chattel Schema (unchanged)
const chattelSchema = z.object({
  chattelType: z.enum(['included', 'excluded']),
  itemDescription: z.string().min(1, 'Item description is required'),
  quantity: z.coerce.number().min(1).default(1),
});

// Step 3: Tenancy Information (NEW)
const tenancySchema = z.object({
  isCurrentlyTenanted: z.boolean().default(false),
  tenantName: z.string().optional(),
  weeklyRent: z.string().optional(),
  leaseEndDate: z.string().optional(),
  bondAmount: z.string().optional(),
  keepTenant: z.boolean().optional(), // true = subject to tenancy, false = vacant possession
}).superRefine((data, ctx) => {
  // If property is currently tenanted, require tenant details
  if (data.isCurrentlyTenanted) {
    if (!data.tenantName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tenant name is required for tenanted properties',
        path: ['tenantName'],
      });
    }
    if (!data.weeklyRent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Weekly rent is required for tenanted properties',
        path: ['weeklyRent'],
      });
    }
    if (!data.leaseEndDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Lease end date is required for tenanted properties',
        path: ['leaseEndDate'],
      });
    }
    if (data.keepTenant === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please specify if you want to keep the tenant or require vacant possession',
        path: ['keepTenant'],
      });
    }
  }
});

// Step 4: Simplified Lawyer Details
const lawyerDetailsSchema = z.object({
  haveLawyer: z.boolean().default(false),
  lawyerStatus: z.enum(['have_one', 'need_one', 'need_recommendation']).optional(),
  lawyerName: z.string().optional(), // Combined firm or lawyer name
  lawyerEmail: z.string().email().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  // If they have a lawyer or selected 'have_one', require name and email
  if (data.haveLawyer || data.lawyerStatus === 'have_one') {
    if (!data.lawyerName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Lawyer/firm name is required',
        path: ['lawyerName'],
      });
    }
    if (!data.lawyerEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Lawyer email is required',
        path: ['lawyerEmail'],
      });
    }
  }
});

const buyerDetailsSchema = z.object({
  haveLawyer: z.boolean().default(false),
  lawyerStatus: z.enum(['have_one', 'need_one', 'need_recommendation']).optional(),
  lawyerName: z.string().optional(),
  lawyerEmail: z.string().email().optional().or(z.literal('')),
});

const conditionSchema = z.object({
  conditionType: z.string().min(1, 'Condition type is required'),
  description: z.string().min(1, 'Description is required'),
  daysToSatisfy: z.coerce.number().min(1),
});

interface OfferWizardProps {
  propertyId: string;
  onClose: () => void;
}

export function OfferWizard({ propertyId, onClose }: OfferWizardProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [offerId, setOfferId] = useState<string | null>(null);

  // Debug: Log when wizard mounts
  useEffect(() => {
    console.log('🏗️ OfferWizard mounted');
    console.log('📍 Property ID:', propertyId);
    console.log('🔧 onClose function exists:', !!onClose);
  }, []);

  // Fetch property details
  const { data: property } = useQuery<any>({
    queryKey: [`/api/properties/${propertyId}`],
  });

  // Fetch standard chattels
  const { data: standardChattels = [] } = useQuery<any[]>({
    queryKey: ['/api/offer-wizard/standard-chattels'],
  });

  // Check for existing draft offer for this property
  const { data: draftOffer, isLoading: draftLoading } = useQuery<any>({
    queryKey: [`/api/offer-wizard/properties/${propertyId}/draft-offer`],
  });

  // Auto-load draft offer if exists
  useEffect(() => {
    if (draftOffer && !offerId) {
      setOfferId(draftOffer.id);
      setCurrentStep(draftOffer.wizardStep || 1);
      toast({
        title: 'Draft offer found',
        description: `Resuming from step ${draftOffer.wizardStep || 1}`,
      });
    }
  }, [draftOffer, offerId, toast]);

  // Fetch offer data if resuming
  const { data: offer } = useQuery<any>({
    queryKey: [`/api/offer-wizard/offers/${offerId}`],
    enabled: !!offerId,
  });

  // Fetch buyer details
  const { data: buyerDetails } = useQuery<any>({
    queryKey: [`/api/offer-wizard/offers/${offerId}/buyer-details`],
    enabled: !!offerId,
  });

  // Fetch conditions
  const { data: conditions = [] } = useQuery<any[]>({
    queryKey: [`/api/offer-wizard/offers/${offerId}/conditions`],
    enabled: !!offerId,
  });

  // Fetch chattels
  const { data: chattels = [] } = useQuery<any[]>({
    queryKey: [`/api/offer-wizard/offers/${offerId}/chattels`],
    enabled: !!offerId,
  });

  // Step 1: Create or update offer mutation (PHASE 1: Complete payload)
  const createOfferMutation = useMutation({
    mutationFn: async (data: z.infer<typeof offerDetailsSchema>) => {
      // Clean currency fields (remove symbols and commas)
      const cleanData = {
        // Property confirmation
        propertyAddress: data.propertyAddress,
        propertyTitleReference: data.propertyTitleReference || null,
        propertyLegalDescription: data.propertyLegalDescription || null,
        propertyType: data.propertyType,
        
        // Offer amounts (cleaned and with calculated balance)
        offerPrice: data.offerPrice.replace(/[$,]/g, ''),
        depositAmount: data.depositAmount.replace(/[$,]/g, ''),
        depositPaymentDate: data.depositPaymentDate,
        balancePayable: data.balancePayable?.replace(/[$,]/g, '') || null, // Auto-calculated via superRefine
        balancePayableDate: data.balancePayableDate || data.settlementDate, // Defaults to settlement date
        settlementDate: data.settlementDate,
        
        // Required condition toggles with deadlines (ADLS compliance)
        financeRequired: data.financeRequired,
        financeAmount: data.financeRequired && data.financeAmount ? data.financeAmount.replace(/[$,]/g, '') : null,
        financeDeadline: data.financeRequired ? data.financeDeadline : null,
        limRequired: data.limRequired,
        limDeadline: data.limRequired ? data.limDeadline : null,
        buildingInspectionRequired: data.buildingInspectionRequired,
        buildingInspectionDeadline: data.buildingInspectionRequired ? data.buildingInspectionDeadline : null,
        methTestRequired: data.methTestRequired,
        methTestDeadline: data.methTestRequired ? data.methTestDeadline : null,
      };
      
      // If we already have an offerId (from loaded draft), update it instead of creating new
      if (offerId) {
        console.log('💾 UPDATING EXISTING OFFER (Phase 1):', offerId, cleanData);
        const result = await apiRequestJson('PATCH', `/api/offer-wizard/offers/${offerId}`, cleanData);
        console.log('✅ OFFER UPDATED:', result);
        return result;
      }
      
      // Otherwise create a new offer
      console.log('💾 CREATING NEW OFFER (Phase 1) with data:', cleanData);
      const result = await apiRequestJson('POST', `/api/offer-wizard/offers`, {
        ...cleanData,
        propertyId,
      });
      console.log('✅ OFFER CREATED:', result);
      return result;
    },
    onSuccess: (updatedOffer) => {
      if (!offerId) {
        setOfferId(updatedOffer.id);
      }
      toast({ title: offerId ? 'Offer updated' : 'Offer created', description: 'Continue with your offer details' });
      setCurrentStep(2);
    },
    onError: (error: Error) => {
      console.error('❌ OFFER ERROR:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Step 2: Save buyer details mutation
  const saveBuyerDetailsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof buyerDetailsSchema>) => {
      console.log('💾 SAVING BUYER DETAILS:', data);
      const method = buyerDetails ? 'PATCH' : 'POST';
      const result = await apiRequestJson(method, `/api/offer-wizard/offers/${offerId}/buyer-details`, data);
      console.log('✅ BUYER DETAILS SAVED:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/offer-wizard/offers/${offerId}/buyer-details`] });
      toast({ title: 'Buyer details saved' });
      setCurrentStep(3);
    },
    onError: (error: Error) => {
      console.error('❌ BUYER DETAILS ERROR:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Step 3: Add condition mutation
  const addConditionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof conditionSchema>) => {
      return apiRequestJson('POST', `/api/offer-wizard/offers/${offerId}/conditions`, {
        ...data,
        dueDate: new Date(Date.now() + data.daysToSatisfy * 24 * 60 * 60 * 1000).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/offer-wizard/offers/${offerId}/conditions`] });
      toast({ title: 'Condition added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete condition mutation
  const deleteConditionMutation = useMutation({
    mutationFn: async (conditionId: string) => {
      return apiRequestJson('DELETE', `/api/offer-wizard/conditions/${conditionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/offer-wizard/offers/${offerId}/conditions`] });
      toast({ title: 'Condition removed' });
    },
  });

  // Step 4: Add chattel mutation
  const addChattelMutation = useMutation({
    mutationFn: async (data: z.infer<typeof chattelSchema>) => {
      return apiRequestJson('POST', `/api/offer-wizard/offers/${offerId}/chattels`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/offer-wizard/offers/${offerId}/chattels`] });
      toast({ title: 'Item added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete chattel mutation
  const deleteChattelMutation = useMutation({
    mutationFn: async (chattelId: string) => {
      return apiRequestJson('DELETE', `/api/offer-wizard/chattels/${chattelId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/offer-wizard/offers/${offerId}/chattels`] });
      toast({ title: 'Item removed' });
    },
  });

  // Step 5: Submit offer mutation
  const submitOfferMutation = useMutation({
    mutationFn: async () => {
      return apiRequestJson('POST', `/api/offer-wizard/offers/${offerId}/submit`);
    },
    onSuccess: () => {
      toast({
        title: 'Offer submitted!',
        description: 'Your offer has been sent to the property owner',
      });
      // Invalidate all offers queries (will match scoped queries by user ID)
      queryClient.invalidateQueries({ queryKey: ['/api/offer-wizard/offers/my-offers'] });
      onClose();
      navigate('/my-offers');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Save & Exit mutation - updates wizard step and closes
  const saveAndExitMutation = useMutation({
    mutationFn: async () => {
      console.log('💾 SAVE & EXIT:', { offerId, currentStep });
      return apiRequestJson('PATCH', `/api/offer-wizard/offers/${offerId}/step`, {
        wizardStep: currentStep,
      });
    },
    onSuccess: () => {
      console.log('✅ SAVE & EXIT SUCCESS');
      toast({
        title: 'Progress saved',
        description: 'You can continue this offer later from My Offers',
      });
      // Invalidate all offers queries (will match scoped queries by user ID)
      queryClient.invalidateQueries({ queryKey: ['/api/offer-wizard/offers/my-offers'] });
      queryClient.invalidateQueries({ queryKey: [`/api/offer-wizard/properties/${propertyId}/draft-offer`] });
      onClose();
    },
    onError: (error: Error) => {
      console.error('❌ SAVE & EXIT ERROR:', error);
      toast({ title: 'Error saving progress', description: error.message, variant: 'destructive' });
    },
  });

  const handleSaveAndExit = async () => {
    console.log('🚪 Save & Exit clicked:', { offerId, currentStep });
    
    if (!offerId) {
      console.log('⚠️ No offerId - just closing');
      onClose();
      return;
    }

    // Save current form data before exiting
    try {
      if (currentStep === 2) {
        // Save buyer details
        const buyerData = buyerDetailsForm.getValues();
        console.log('💾 Saving buyer details on exit:', buyerData);
        await saveBuyerDetailsMutation.mutateAsync(buyerData);
      }
      // Steps 3 & 4 don't have form data that needs saving (items are saved individually)
      
      // Now save the wizard step and exit
      saveAndExitMutation.mutate();
    } catch (error) {
      console.error('❌ Error saving data before exit:', error);
      // Still try to save the step
      saveAndExitMutation.mutate();
    }
  };

  const handleNextStep = (nextStep: number) => {
    console.log(`⏭️ NEXT BUTTON CLICKED: Step ${currentStep} → ${nextStep}`);
    setCurrentStep(nextStep);
  };

  // Forms for each step
  const offerDetailsForm = useForm<z.infer<typeof offerDetailsSchema>>({
    resolver: zodResolver(offerDetailsSchema),
    defaultValues: {
      offerPrice: '',
      depositAmount: '',
      depositPaymentDate: '',
      settlementDate: '',
    },
  });

  const buyerDetailsForm = useForm<z.infer<typeof buyerDetailsSchema>>({
    resolver: zodResolver(buyerDetailsSchema),
    defaultValues: {
      haveLawyer: false,
      lawyerName: '',
      lawyerEmail: '',
    },
  });

  const conditionForm = useForm<z.infer<typeof conditionSchema>>({
    resolver: zodResolver(conditionSchema),
    defaultValues: {
      conditionType: '',
      description: '',
      daysToSatisfy: 10,
    },
  });

  const chattelForm = useForm<z.infer<typeof chattelSchema>>({
    resolver: zodResolver(chattelSchema),
    defaultValues: {
      chattelType: 'included',
      itemDescription: '',
      quantity: 1,
    },
  });

  // Update forms when data loads (for draft resume)
  useEffect(() => {
    if (offer) {
      console.log('📝 LOADING OFFER DATA into form:', offer);
      
      // Format dates for the date input (needs YYYY-MM-DD format)
      const formatDateForInput = (dateStr: string | Date | null) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      };
      
      const formData = {
        offerPrice: offer.offerPrice || '',
        depositAmount: offer.depositAmount || '',
        depositPaymentDate: formatDateForInput(offer.depositPaymentDate),
        settlementDate: formatDateForInput(offer.settlementDate),
      };
      
      console.log('📅 FORMATTED DATES:', {
        raw: { depositPaymentDate: offer.depositPaymentDate, settlementDate: offer.settlementDate },
        formatted: { depositPaymentDate: formData.depositPaymentDate, settlementDate: formData.settlementDate }
      });
      
      offerDetailsForm.reset(formData);
    }
  }, [offer, offerDetailsForm]);

  useEffect(() => {
    if (buyerDetails) {
      console.log('📝 LOADING BUYER DETAILS into form:', buyerDetails);
      buyerDetailsForm.reset(buyerDetails);
    }
  }, [buyerDetails, buyerDetailsForm]);

  const steps = [
    { number: 1, title: 'Offer Details', icon: Home },
    { number: 2, title: 'Buyer Info', icon: User },
    { number: 3, title: 'Conditions', icon: FileText },
    { number: 4, title: 'Chattels', icon: ShoppingCart },
    { number: 5, title: 'Review', icon: Check },
  ];

  const conditionTypes = [
    { value: 'finance', label: 'Finance Approval' },
    { value: 'lim_report', label: 'LIM Report' },
    { value: 'building_inspection', label: 'Building Inspection' },
    { value: 'title_search', label: 'Title Search' },
    { value: 'valuation', label: 'Property Valuation' },
    { value: 'insurance', label: 'Insurance Approval' },
    { value: 'sale_of_buyers_property', label: 'Sale of Buyer\'s Property' },
    { value: 'custom', label: 'Custom Condition' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4 py-8">
        <Card className="w-full max-w-4xl bg-white dark:bg-gray-900">
          <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-6 h-6" />
            Make Official Offer - {property?.address}
            <div className="bg-green-100 border border-green-400 text-green-800 text-xs font-semibold px-2 py-1 rounded ml-2">
              ADLS-Compliant
            </div>
          </CardTitle>
          <CardDescription>
            Complete the 5-step wizard to create a legally binding property purchase offer using ADLS forms
          </CardDescription>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mt-6">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      currentStep >= step.number
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}
                    data-testid={`wizard-step-${step.number}`}
                  >
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs mt-1 hidden md:block">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      currentStep > step.number ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {/* Step 1: Offer Details */}
          {currentStep === 1 && (
            <Form {...offerDetailsForm}>
              <form onSubmit={offerDetailsForm.handleSubmit((data) => createOfferMutation.mutate(data))} className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Listed Price:</strong> {property?.price}
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    <strong>Note:</strong> ADLS forms cost $136.85 per transaction and are required for legally binding offers
                  </p>
                </div>

                <FormField
                  control={offerDetailsForm.control}
                  name="offerPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offer Price *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., $750,000" {...field} data-testid="input-offer-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={offerDetailsForm.control}
                  name="depositAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deposit Amount *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., $75,000 (typically 10%)" {...field} data-testid="input-deposit-amount" />
                      </FormControl>
                      <FormDescription>Standard deposit is 10% of offer price</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={offerDetailsForm.control}
                    name="depositPaymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deposit Payment Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-deposit-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={offerDetailsForm.control}
                    name="settlementDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Settlement Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-settlement-date" />
                        </FormControl>
                        <FormDescription>Typically 30-90 days</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <div className="flex gap-2">
                    {offerId && (
                      <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={handleSaveAndExit}
                        disabled={saveAndExitMutation.isPending}
                        data-testid="button-save-exit"
                      >
                        {saveAndExitMutation.isPending ? 'Saving...' : 'Save & Exit'}
                      </Button>
                    )}
                    <Button type="submit" disabled={createOfferMutation.isPending} data-testid="button-next-step">
                      {createOfferMutation.isPending ? 'Creating...' : 'Next'} <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          )}

          {/* Step 2: Buyer Details */}
          {currentStep === 2 && (
            <Form {...buyerDetailsForm}>
              <form onSubmit={buyerDetailsForm.handleSubmit((data) => saveBuyerDetailsMutation.mutate(data))} className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Important:</strong> It's highly recommended to have a lawyer review your offer before submission
                  </p>
                </div>

                <FormField
                  control={buyerDetailsForm.control}
                  name="lawyerStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do you have a lawyer?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-lawyer-status">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="have_one">Yes, I have a lawyer</SelectItem>
                          <SelectItem value="need_one">No, I need to find one</SelectItem>
                          <SelectItem value="need_recommendation">No, I'd like a recommendation</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {buyerDetailsForm.watch('lawyerStatus') === 'have_one' && (
                  <>
                    <FormField
                      control={buyerDetailsForm.control}
                      name="lawyerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lawyer / Firm Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith or Smith & Partners Law" {...field} data-testid="input-lawyer-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={buyerDetailsForm.control}
                      name="lawyerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lawyer Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@smithlaw.co.nz" {...field} data-testid="input-lawyer-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(1)} data-testid="button-back">
                    <ChevronLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={handleSaveAndExit}
                      disabled={saveAndExitMutation.isPending}
                      data-testid="button-save-exit"
                    >
                      {saveAndExitMutation.isPending ? 'Saving...' : 'Save & Exit'}
                    </Button>
                    <Button type="submit" disabled={saveBuyerDetailsMutation.isPending} data-testid="button-next-step">
                      {saveBuyerDetailsMutation.isPending ? 'Saving...' : 'Next'} <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          )}

          {/* Step 3: Conditions */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Add any conditions that must be satisfied before the offer becomes unconditional
                </p>
              </div>

              {/* Existing Conditions */}
              {conditions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">Current Conditions:</h3>
                  {conditions.map((condition: any) => (
                    <div key={condition.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`condition-${condition.id}`}>
                      <div>
                        <p className="font-medium capitalize">{condition.conditionType.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{condition.description}</p>
                        <p className="text-xs text-gray-500">{condition.daysToSatisfy} days to satisfy</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteConditionMutation.mutate(condition.id)}
                        data-testid={`button-delete-condition-${condition.id}`}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Condition */}
              <Form {...conditionForm}>
                <form
                  onSubmit={conditionForm.handleSubmit((data) => {
                    addConditionMutation.mutate(data);
                    conditionForm.reset();
                  })}
                  className="space-y-4 border-t pt-4 mt-4"
                >
                  <h3 className="font-medium">Add Condition:</h3>

                  <FormField
                    control={conditionForm.control}
                    name="conditionType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condition Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-condition-type">
                              <SelectValue placeholder="Select condition type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {conditionTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={conditionForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description *</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe the condition details..." {...field} data-testid="input-condition-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={conditionForm.control}
                    name="daysToSatisfy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Days to Satisfy *</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={60} {...field} data-testid="input-days-to-satisfy" />
                        </FormControl>
                        <FormDescription>Number of days to fulfill this condition (1-60 days)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={addConditionMutation.isPending} data-testid="button-add-condition">
                    {addConditionMutation.isPending ? 'Adding...' : 'Add Condition'}
                  </Button>
                </form>
              </Form>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setCurrentStep(2)} data-testid="button-back">
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleSaveAndExit}
                    disabled={saveAndExitMutation.isPending}
                    data-testid="button-save-exit"
                  >
                    {saveAndExitMutation.isPending ? 'Saving...' : 'Save & Exit'}
                  </Button>
                  <Button onClick={() => handleNextStep(4)} data-testid="button-next-step">
                    Next <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Chattels */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Specify items that are included or excluded from the sale
                </p>
              </div>

              {/* Selected Chattels */}
              {chattels.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">Selected Items:</h3>
                  {chattels.map((chattel: any) => (
                    <div key={chattel.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`chattel-${chattel.id}`}>
                      <div>
                        <p className="font-medium">{chattel.itemDescription}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {chattel.chattelType === 'included' ? '✅ Included' : '❌ Excluded'} • Qty: {chattel.quantity}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteChattelMutation.mutate(chattel.id)}
                        data-testid={`button-delete-chattel-${chattel.id}`}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Add from Standard Chattels */}
              {standardChattels.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Quick Add Common Items:</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {standardChattels
                      .filter((sc: any) => sc.typicallyIncluded)
                      .slice(0, 9)
                      .map((sc: any) => (
                        <Button
                          key={sc.id}
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            addChattelMutation.mutate({
                              chattelType: 'included',
                              itemDescription: sc.description,
                              quantity: 1,
                            })
                          }
                          className="text-left justify-start h-auto py-2"
                          data-testid={`button-quick-add-${sc.id}`}
                        >
                          {sc.description}
                        </Button>
                      ))}
                  </div>
                </div>
              )}

              {/* Add Custom Chattel */}
              <Form {...chattelForm}>
                <form
                  onSubmit={chattelForm.handleSubmit((data) => {
                    addChattelMutation.mutate(data);
                    chattelForm.reset({ chattelType: 'included', itemDescription: '', quantity: 1 });
                  })}
                  className="space-y-4 border-t pt-4"
                >
                  <h3 className="font-medium">Add Custom Item:</h3>

                  <FormField
                    control={chattelForm.control}
                    name="chattelType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Status *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-chattel-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="included">Included in Sale</SelectItem>
                            <SelectItem value="excluded">Excluded from Sale</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={chattelForm.control}
                    name="itemDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Description *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Garden furniture" {...field} data-testid="input-chattel-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={chattelForm.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity *</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} data-testid="input-chattel-quantity" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={addChattelMutation.isPending} data-testid="button-add-chattel">
                    {addChattelMutation.isPending ? 'Adding...' : 'Add Item'}
                  </Button>
                </form>
              </Form>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setCurrentStep(3)} data-testid="button-back">
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleSaveAndExit}
                    disabled={saveAndExitMutation.isPending}
                    data-testid="button-save-exit"
                  >
                    {saveAndExitMutation.isPending ? 'Saving...' : 'Save & Exit'}
                  </Button>
                  <Button onClick={() => handleNextStep(5)} data-testid="button-next-step">
                    Review & Submit <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review & Submit */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Ready to submit!</strong> Review your offer details below
                </p>
              </div>

              {/* Offer Summary */}
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="font-semibold text-lg">Offer Details</h3>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Offer Price:</span>
                      <p className="font-medium">{offer?.offerPrice}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Deposit:</span>
                      <p className="font-medium">{offer?.depositAmount}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Deposit Due:</span>
                      <p className="font-medium">{offer?.depositPaymentDate && format(new Date(offer.depositPaymentDate), 'dd MMM yyyy')}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Settlement:</span>
                      <p className="font-medium">{offer?.settlementDate && format(new Date(offer.settlementDate), 'dd MMM yyyy')}</p>
                    </div>
                  </div>
                </div>

                <div className="border-b pb-2">
                  <h3 className="font-semibold text-lg">Conditions ({conditions.length})</h3>
                  {conditions.length === 0 ? (
                    <p className="text-sm text-gray-500">No conditions (unconditional offer)</p>
                  ) : (
                    <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                      {conditions.map((condition: any) => (
                        <li key={condition.id} className="capitalize">
                          {condition.conditionType.replace(/_/g, ' ')} ({condition.daysToSatisfy} days)
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border-b pb-2">
                  <h3 className="font-semibold text-lg">Chattels ({chattels.length})</h3>
                  {chattels.length === 0 ? (
                    <p className="text-sm text-gray-500">No chattels specified</p>
                  ) : (
                    <div className="text-sm space-y-1 mt-2">
                      {chattels.map((chattel: any) => (
                        <p key={chattel.id}>
                          {chattel.chattelType === 'included' ? '✅' : '❌'} {chattel.itemDescription} (x{chattel.quantity})
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {buyerDetails?.lawyerStatus === 'have_one' && (
                  <div className="border-b pb-2">
                    <h3 className="font-semibold text-lg">Lawyer Details</h3>
                    <div className="text-sm mt-2">
                      <p>{buyerDetails.lawyerName}</p>
                      <p className="text-gray-600 dark:text-gray-400">{buyerDetails.lawyerEmail}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Legal Disclaimer */}
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">⚠️ Important Legal Notice</h3>
                <ul className="text-sm text-red-800 dark:text-red-200 space-y-1 list-disc list-inside">
                  <li>This offer uses ADLS Form 11th Edition (2022) - cost $136.85</li>
                  <li>Have your lawyer review the offer before signing</li>
                  <li>HouseMatch.nz does not provide legal advice</li>
                  <li>This offer becomes legally binding once accepted</li>
                </ul>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setCurrentStep(4)} data-testid="button-back">
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button
                  onClick={() => submitOfferMutation.mutate()}
                  disabled={submitOfferMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-submit-offer"
                >
                  {submitOfferMutation.isPending ? 'Submitting...' : 'Submit Offer'} <Check className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
