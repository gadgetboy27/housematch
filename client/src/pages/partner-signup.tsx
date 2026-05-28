import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Building2, Mail, Phone, Globe, MapPin, CreditCard, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const signupSchema = z.object({
  // Company details
  companyName: z.string().min(2, "Company name is required"),
  contactName: z.string().min(2, "Contact name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string()
    .min(1, "Phone number is required")
    .refine(
      (val) => {
        const cleaned = val.replace(/[\s\-\(\)]/g, '');
        return /^\+64[2-9]\d{7,9}$/.test(cleaned);
      },
      { message: "Must be a valid NZ phone number starting with +64" }
    ),
  businessAddress: z.string().optional(),
  gstNumber: z.string()
    .min(1, "GST number is required")
    .refine(
      (val) => {
        const cleaned = val.replace(/[\s\-]/g, '');
        return /^\d{8,9}$/.test(cleaned) || /^\d{3}-\d{3}-\d{3}$/.test(val);
      },
      { message: "Must be a valid NZ GST number (8-9 digits or XXX-XXX-XXX format)" }
    ),
  website: z.string()
    .transform((val) => {
      if (!val || val === "") return "";
      // Add https:// if user typed www. or just a domain
      if (val.startsWith("www.") || (!val.startsWith("http://") && !val.startsWith("https://"))) {
        return `https://${val}`;
      }
      return val;
    })
    .pipe(z.union([z.string().url("Please enter a valid website URL (e.g., www.example.com)"), z.literal("")]))
    .optional(),
  description: z.string()
    .optional()
    .refine(
      (val) => !val || val === "" || val.length >= 10,
      { message: "Description must be at least 10 characters if provided" }
    ),
  
  // Services and regions
  serviceTypes: z.array(z.string()).min(1, "Select at least one service"),
  regions: z.array(z.string()).min(1, "Select at least one region"),
  
  // Account tier
  accountType: z.enum(["preferred_client", "service_partner"]),
});

type SignupFormData = z.infer<typeof signupSchema>;

const serviceOptions = [
  { value: "legal", label: "Legal Services / Conveyancing", tier: "preferred_client", icon: "⚖️" },
  { value: "mortgage_broker", label: "Mortgage Brokers", tier: "preferred_client", icon: "🏦" },
  { value: "photography", label: "Photography", tier: "preferred_client", icon: "📸" },
  { value: "home_staging", label: "Home Staging", tier: "service_partner", icon: "🏠" },
  { value: "cleaning", label: "Cleaning Services", tier: "service_partner", icon: "✨" },
  { value: "moving", label: "Moving Services", tier: "service_partner", icon: "🚚" },
  { value: "building_inspection", label: "Building Inspections", tier: "service_partner", icon: "🔍" },
  { value: "property_management", label: "Property Management", tier: "service_partner", icon: "🏢" },
];

const regionOptions = [
  "Auckland",
  "Wellington",
  "Christchurch",
  "Hamilton",
  "Tauranga",
  "Dunedin",
  "Palmerston North",
  "Nelson",
  "Rotorua",
  "Queenstown",
];

export default function PartnerSignup() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur", // Validate on blur for immediate feedback
    reValidateMode: "onChange", // Re-validate on change after first blur
    defaultValues: {
      companyName: "",
      contactName: "",
      email: "",
      phone: "+64 ",
      businessAddress: "",
      gstNumber: "",
      website: "",
      description: "",
      serviceTypes: [],
      regions: [],
      accountType: "service_partner",
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      const response = await apiRequest("POST", "/partner/signup", data);
      return response.json();
    },
    onSuccess: (data) => {
      // Show success modal for all applications
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      toast({
        title: "Application Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: SignupFormData) => {
    console.log("📝 Partner Signup Form Data:", JSON.stringify(data, null, 2));
    console.log("📧 Email will be sent to: admin@swiperight.nz");
    console.log("💾 Data will be saved to database with status: pending");
    submitMutation.mutate(data);
  };

  const handleSubmitClick = async () => {
    const isValid = await form.trigger();
    console.log("🔍 Form validation result:", isValid);
    console.log("❌ Form errors:", form.formState.errors);
    if (!isValid) {
      console.error("❌ Form has validation errors:", JSON.stringify(form.formState.errors, null, 2));
      
      // Show toast notification for validation errors
      const errors = form.formState.errors;
      const errorFields = Object.keys(errors);
      const firstError = errors[errorFields[0] as keyof typeof errors];
      
      toast({
        title: "⚠️ Please review your application",
        description: firstError?.message || "Please fix all highlighted errors before submitting.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const nextStep = async () => {
    let isValid = false;
    let fieldsToValidate: string[] = [];
    
    if (step === 1) {
      fieldsToValidate = ["companyName", "contactName", "email", "phone"];
      isValid = await form.trigger(fieldsToValidate as any);
    } else if (step === 2) {
      form.setValue("serviceTypes", selectedServices);
      form.setValue("regions", selectedRegions);
      fieldsToValidate = ["serviceTypes", "regions"];
      isValid = await form.trigger(fieldsToValidate as any);
    }
    
    if (isValid) {
      setStep(step + 1);
    } else {
      // Show toast notification for validation errors
      const errors = form.formState.errors;
      const errorFields = Object.keys(errors);
      const firstError = errors[errorFields[0] as keyof typeof errors];
      
      toast({
        title: "⚠️ Please check your input",
        description: firstError?.message || "Please fix the highlighted errors before continuing.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const toggleService = (serviceValue: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceValue) 
        ? prev.filter(s => s !== serviceValue)
        : [...prev, serviceValue]
    );
  };

  const toggleRegion = (region: string) => {
    setSelectedRegions(prev => 
      prev.includes(region)
        ? prev.filter(r => r !== region)
        : [...prev, region]
    );
  };

  // Determine suggested tier based on selected services
  const suggestedTier = selectedServices.length > 0
    ? serviceOptions.find(s => selectedServices.includes(s.value))?.tier || "service_partner"
    : "service_partner";

  // Check if current step is valid to enable/disable Next button
  const isStepValid = () => {
    const { companyName, contactName, email, phone } = form.watch();
    const errors = form.formState.errors;

    if (step === 1) {
      // Step 1: Required fields are companyName, contactName, email, phone
      return (
        companyName && companyName.length >= 2 &&
        contactName && contactName.length >= 2 &&
        email && !errors.email &&
        phone && !errors.phone
      );
    } else if (step === 2) {
      // Step 2: At least one service and one region
      return selectedServices.length > 0 && selectedRegions.length > 0;
    }
    return true; // Step 3 (Choose Plan) always valid
  };

  return (
    <div className="max-w-sm mx-auto min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => step === 1 ? setLocation("/") : prevStep()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Join Our Network</h1>
            <p className="text-sm text-gray-600">Step {step} of 3</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-6 pb-24">
        
        {/* Step 1: Company Information */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-purple-600" />
                <h2 className="font-semibold text-gray-900">Company Information</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...form.register("companyName")}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      form.formState.errors.companyName 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                    placeholder="e.g., ABC Property Services Ltd"
                    data-testid="input-company-name"
                  />
                  {form.formState.errors.companyName && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <span className="text-red-500">⚠</span> {form.formState.errors.companyName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...form.register("contactName")}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      form.formState.errors.contactName 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                    placeholder="e.g., John Smith"
                    data-testid="input-contact-name"
                  />
                  {form.formState.errors.contactName && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <span className="text-red-500">⚠</span> {form.formState.errors.contactName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Company Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...form.register("email")}
                    type="email"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      form.formState.errors.email 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                    placeholder="e.g., contact@company.co.nz"
                    data-testid="input-email"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <span className="text-red-500">⚠</span> {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...form.register("phone")}
                    type="tel"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      form.formState.errors.phone 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                    placeholder="e.g., +64 21 123 4567"
                    data-testid="input-phone"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value.startsWith('+64')) {
                        e.target.value = '+64 ';
                      }
                      form.setValue('phone', e.target.value);
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">Must start with +64 (NZ only)</p>
                  {form.formState.errors.phone && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <span className="text-red-500">⚠</span> {form.formState.errors.phone.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Business Address
                  </label>
                  <input
                    {...form.register("businessAddress")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="123 Main Street, Auckland"
                    data-testid="input-address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <CreditCard className="w-4 h-4 inline mr-1" />
                    GST Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...form.register("gstNumber")}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      form.formState.errors.gstNumber ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="123-456-789 or 123456789"
                    data-testid="input-gst-number"
                  />
                  {form.formState.errors.gstNumber && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.gstNumber.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Website
                  </label>
                  <input
                    {...form.register("website")}
                    type="url"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="https://www.yourwebsite.co.nz"
                    data-testid="input-website"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brief Description
                  </label>
                  <textarea
                    {...form.register("description")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                    placeholder="Tell us about your business..."
                    data-testid="input-description"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Services & Regions */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <h2 className="font-semibold text-gray-900 mb-3">Services You Offer *</h2>
              <p className="text-sm text-gray-600 mb-4">Select all that apply</p>
              
              <div className="space-y-2">
                {serviceOptions.map((service) => (
                  <label
                    key={service.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedServices.includes(service.value)
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    data-testid={`service-${service.value}`}
                  >
                    <Checkbox
                      checked={selectedServices.includes(service.value)}
                      onCheckedChange={() => toggleService(service.value)}
                    />
                    <span className="text-2xl">{service.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{service.label}</div>
                      <div className="text-xs text-gray-500">
                        {service.tier === "preferred_client" ? "Referral Model" : "Commission Model"}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {form.formState.errors.serviceTypes && (
                <p className="text-sm text-red-600 mt-2">{form.formState.errors.serviceTypes.message}</p>
              )}
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <h2 className="font-semibold text-gray-900 mb-3">Service Regions *</h2>
              <p className="text-sm text-gray-600 mb-4">Select regions you serve</p>
              
              <div className="grid grid-cols-2 gap-2">
                {regionOptions.map((region) => (
                  <label
                    key={region}
                    className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedRegions.includes(region)
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    data-testid={`region-${region.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Checkbox
                      checked={selectedRegions.includes(region)}
                      onCheckedChange={() => toggleRegion(region)}
                    />
                    <span className="text-sm font-medium text-gray-900">{region}</span>
                  </label>
                ))}
              </div>
              {form.formState.errors.regions && (
                <p className="text-sm text-red-600 mt-2">{form.formState.errors.regions.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Choose Account Tier */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white mb-4">
              <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
              <p className="text-purple-100">
                Based on your services, we recommend: <strong className="text-white">
                  {suggestedTier === "preferred_client" ? "Preferred Client" : "Service Partner"}
                </strong>
              </p>
            </div>

            {/* Preferred Client Option */}
            <label
              className={`block cursor-pointer transition-all ${
                form.watch("accountType") === "preferred_client" ? "ring-4 ring-purple-500" : ""
              }`}
              data-testid="tier-preferred-client"
            >
              <input
                type="radio"
                {...form.register("accountType")}
                value="preferred_client"
                className="sr-only"
              />
              <div className="bg-white rounded-xl p-5 shadow-sm border-2 border-gray-200 hover:border-purple-300">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                      {form.watch("accountType") === "preferred_client" && (
                        <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-5 h-5 text-purple-600" />
                      <h3 className="font-bold text-lg text-gray-900">Preferred Client</h3>
                    </div>
                    <p className="text-2xl font-bold text-purple-600 mb-2">$99/month</p>
                    <p className="text-sm text-gray-600 mb-3">
                      Perfect for lawyers, conveyancers, mortgage brokers, and photographers
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Premium listing on HouseMatch platform</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Direct client referrals when we can't fulfill service</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>View-only dashboard with lead notifications</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>No platform fees on referrals</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </label>

            {/* Service Partner Option */}
            <label
              className={`block cursor-pointer transition-all ${
                form.watch("accountType") === "service_partner" ? "ring-4 ring-blue-500" : ""
              }`}
              data-testid="tier-service-partner"
            >
              <input
                type="radio"
                {...form.register("accountType")}
                value="service_partner"
                className="sr-only"
              />
              <div className="bg-white rounded-xl p-5 shadow-sm border-2 border-gray-200 hover:border-blue-300">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                      {form.watch("accountType") === "service_partner" && (
                        <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-lg text-gray-900">Service Partner</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 mb-2">10-15% Platform Fee</p>
                    <p className="text-sm text-gray-600 mb-3">
                      Perfect for cleaning, home staging, moving, building inspections
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>No monthly fees - zero upfront costs</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>We collect payment from customers for you</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>You complete the job and upload proof</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>We pay you when job is complete (minus 10-15% platform fee)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </label>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Your application will be reviewed by our team before activation. 
                {form.watch("accountType") === "preferred_client" && 
                  " You'll be redirected to Stripe to complete your subscription payment."
                }
              </p>
            </div>
          </div>
        )}

        {/* Fixed Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 max-w-sm mx-auto">
          <div className="flex gap-3">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                className="flex-1"
                data-testid="button-prev"
              >
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!isStepValid()}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-next"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                onClick={handleSubmitClick}
                disabled={submitMutation.isPending}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                data-testid="button-submit"
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Application"}
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl">Application Submitted!</DialogTitle>
            <DialogDescription className="text-center pt-4">
              Thank you for your interest in joining our partner network.
              <br /><br />
              <strong>We'll email you once your account has been verified.</strong>
              <br /><br />
              Our team will review your application and get back to you within 2-3 business days.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setLocation("/");
              }}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              data-testid="button-close-success"
            >
              Back to Home
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
