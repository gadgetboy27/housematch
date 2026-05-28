import { useState } from "react";
import { fbTrackLead } from "@/components/FacebookPixel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Property } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import DraftViewerModal from "./draft-viewer-modal";
import { formatNZD } from "@/lib/format";

const offerFormSchema = z.object({
  // Buyer Information
  buyerName: z.string().min(2, "Name must be at least 2 characters"),
  buyerEmail: z.string().email("Please enter a valid email address"),
  buyerPhone: z.string().min(10, "Please enter a valid phone number"),
  
  // Offer Details
  offerPrice: z.string().min(1, "Please enter an offer price"),
  settlementPeriod: z.string().min(1, "Please select a settlement period"),
  
  // Conditions
  financeCondition: z.boolean().default(false),
  buildingInspectionCondition: z.boolean().default(false),
  limCondition: z.boolean().default(false),
  
  // Additional Details
  additionalConditions: z.string().optional(),
  additionalComments: z.string().optional(),
});

type OfferFormData = z.infer<typeof offerFormSchema>;

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
}

export default function OfferModal({ isOpen, onClose, property }: OfferModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDraftViewer, setShowDraftViewer] = useState(false);
  const [draftDocumentId, setDraftDocumentId] = useState<string>("");
  const { toast } = useToast();

  // Format number with dollar sign and commas
  const formatPrice = (value: string): string => {
    // Remove all non-digit characters except decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    
    // Handle empty string
    if (!numericValue) return '';
    
    // Parse as number and format with commas
    const number = parseFloat(numericValue);
    if (isNaN(number)) return '';
    
    // Format with commas and add dollar sign
    return '$' + number.toLocaleString('en-NZ', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    });
  };

  // Extract numeric value for form submission
  const extractNumericValue = (formattedValue: string): string => {
    return formattedValue.replace(/[^0-9.]/g, '');
  };

  const form = useForm<OfferFormData>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      buyerName: "",
      buyerEmail: "",
      buyerPhone: "",
      offerPrice: "",
      settlementPeriod: "",
      financeCondition: true, // Default to true for buyer protection
      buildingInspectionCondition: true,
      limCondition: false,
      additionalConditions: "",
      additionalComments: "",
    },
  });

  const onSubmit = async (data: OfferFormData) => {
    setIsSubmitting(true);
    try {
      console.log("📄 Generating offer for property:", property.id);
      console.log("📝 Offer details:", data);

      // Call backend API to create offer and generate draft
      const response = await apiRequest('POST', '/api/offers', {
        propertyId: property.id,
        buyerName: data.buyerName,
        buyerEmail: data.buyerEmail,
        buyerPhone: data.buyerPhone,
        offerPrice: data.offerPrice,
        settlementPeriod: data.settlementPeriod,
        financeCondition: data.financeCondition,
        buildingInspectionCondition: data.buildingInspectionCondition,
        limCondition: data.limCondition,
        additionalConditions: data.additionalConditions,
        additionalComments: data.additionalComments,
      });

      const result = await response.json();
      console.log("✅ Offer submitted successfully:", result);

      // FB: Track lead (express interest = high-intent buyer signal)
      fbTrackLead({
        id: property.id,
        address: property.address,
        price: property.price ?? undefined,
        suburb: property.suburb ?? undefined,
      });

      toast({
        title: "Express Interest Sent Successfully! 📧",
        description: "Your expression of interest has been sent to the property owner. They'll be in touch soon!",
        variant: "default",
      });

      // Open draft preview modal
      setDraftDocumentId(result.draftDocument.id);
      onClose();
      
      // Show draft viewer after a brief delay
      setTimeout(() => setShowDraftViewer(true), 300);
    } catch (error) {
      console.error("Error generating offer:", error);
      toast({
        title: "Error",
        description: "Failed to generate offer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <i className="fas fa-envelope text-purple-600"></i>
            Express Interest - {property.title}
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-2">
              <p>Submit a quick interest form to the seller. This is a non-binding expression of interest.</p>
              <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm text-blue-800">
                <i className="fas fa-info-circle mr-1"></i>
                <strong>Looking for a legally binding offer?</strong> Find this property in your "Liked" section to access the Official Offer Wizard with ADLS-compliant forms.
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Property Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Property Details</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div><strong>Address:</strong> {property.address}, {property.suburb}</div>
                <div><strong>Asking Price:</strong> {formatNZD(property.price)}</div>
                <div><strong>Property Type:</strong> {property.propertyType}</div>
                {property.bedrooms && <div><strong>Bedrooms:</strong> {property.bedrooms}</div>}
                {property.bathrooms && <div><strong>Bathrooms:</strong> {property.bathrooms}</div>}
              </div>
            </div>

            {/* Buyer Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <i className="fas fa-user text-blue-600"></i>
                Buyer Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="buyerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="buyerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="buyerPhone"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="+64 21 XXX XXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Offer Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <i className="fas fa-dollar-sign text-green-600"></i>
                Offer Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="offerPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Offer Price *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter amount (e.g. 750000)"
                          value={formatPrice(field.value)}
                          onChange={(e) => {
                            const numericValue = extractNumericValue(e.target.value);
                            field.onChange(numericValue);
                          }}
                          data-testid="input-offer-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="settlementPeriod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Settlement Period *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select settlement period" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="30-days">30 days</SelectItem>
                          <SelectItem value="45-days">45 days</SelectItem>
                          <SelectItem value="60-days">60 days</SelectItem>
                          <SelectItem value="90-days">90 days</SelectItem>
                          <SelectItem value="cash-unconditional">Cash - Unconditional</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Conditions Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <i className="fas fa-clipboard-check text-orange-600"></i>
                Conditions (Recommended for Buyer Protection)
              </h3>
              
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="financeCondition"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-medium">
                          Subject to Finance Approval
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Protect yourself if mortgage approval falls through
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="buildingInspectionCondition"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-medium">
                          Subject to Building Inspection
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Professional inspection to identify potential issues
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="limCondition"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-medium">
                          Subject to LIM Report
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Land Information Memorandum from council
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Additional Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <i className="fas fa-edit text-purple-600"></i>
                Additional Details
              </h3>
              
              <FormField
                control={form.control}
                name="additionalConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Conditions (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="e.g., Subject to sale of existing property, specific chattels to be included..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="additionalComments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comments for Vendor (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional information you'd like the seller to know..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Disclaimer */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <i className="fas fa-exclamation-triangle text-yellow-600 mt-1"></i>
                <div>
                  <h4 className="font-medium text-yellow-800">Legal Disclaimer</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    This tool generates a draft agreement for your review. Please have a qualified lawyer 
                    review all legal documents before signing. HouseMatch NZ is not responsible for legal advice 
                    or the enforceability of generated documents.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Generating Draft...
                  </>
                ) : (
                  <>
                    <i className="fas fa-file-contract mr-2"></i>
                    Generate Draft Agreement
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
      
      {/* Draft Viewer Modal */}
      <DraftViewerModal 
        isOpen={showDraftViewer}
        onClose={() => setShowDraftViewer(false)}
        draftId={draftDocumentId}
      />
    </Dialog>
  );
}