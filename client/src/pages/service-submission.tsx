import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertServiceProviderSchema, type InsertServiceProvider } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, Mail, Phone, Globe, MapPin } from "lucide-react";
import { useLocation } from "wouter";

const serviceCategories = [
  { value: "photographer", label: "Photography", icon: "📸" },
  { value: "lawyer", label: "Legal Services", icon: "⚖️" },
  { value: "mortgage_broker", label: "Mortgage Brokers", icon: "🏦" },
  { value: "banker", label: "Banking", icon: "💰" },
  { value: "inspector", label: "Building Inspection", icon: "🔍" },
  { value: "surveyor", label: "Land Surveying", icon: "📏" },
  { value: "other", label: "Other Services", icon: "🛠️" }
];

export default function ServiceSubmission() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  
  const form = useForm<InsertServiceProvider>({
    resolver: zodResolver(insertServiceProviderSchema),
    defaultValues: {
      businessName: "",
      contactName: "",
      email: "",
      phone: "",
      category: "photographer",
      description: "",
      websiteUrl: "",
      logoUrl: "",
      certifications: [],
      servicesOffered: [],
      priceRange: "",
      serviceAreas: [],
      businessAddress: "",
      licenseNumber: "",
      insuranceDetails: ""
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (data: InsertServiceProvider) => {
      const response = await apiRequest("POST", "/api/service-providers", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted!",
        description: "We'll review your application and get back to you within 2-3 business days.",
        duration: 5000,
      });
      setLocation("/reports");
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: InsertServiceProvider) => {
    // Convert comma-separated strings to arrays
    const processedData = {
      ...data,
      certifications: data.certifications || [],
      servicesOffered: typeof data.servicesOffered === 'string' 
        ? (data.servicesOffered as any).split(',').map((s: string) => s.trim()).filter(Boolean)
        : data.servicesOffered || [],
      serviceAreas: typeof data.serviceAreas === 'string'
        ? (data.serviceAreas as any).split(',').map((s: string) => s.trim()).filter(Boolean)
        : data.serviceAreas || []
    };
    submitMutation.mutate(processedData);
  };

  const selectedCategory = serviceCategories.find(cat => cat.value === form.watch("category"));

  return (
    <div className="max-w-sm mx-auto min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/reports")}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">List Your Service</h1>
            <p className="text-sm text-gray-600">Join our professional network</p>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-6">
        {/* Business Information */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-gray-900">Business Information</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name *
              </label>
              <input
                {...form.register("businessName")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Your business name"
                data-testid="input-business-name"
              />
              {form.formState.errors.businessName && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.businessName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person *
              </label>
              <input
                {...form.register("contactName")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Your full name"
                data-testid="input-contact-name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Category *
              </label>
              <select
                {...form.register("category")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                data-testid="select-category"
              >
                {serviceCategories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.icon} {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Description *
              </label>
              <textarea
                {...form.register("description")}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Describe your services and what makes you unique..."
                data-testid="textarea-description"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-gray-900">Contact Details</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Email *
              </label>
              <input
                {...form.register("email")}
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="contact@yourbusiness.com"
                data-testid="input-email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                {...form.register("phone")}
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="09 123 4567"
                data-testid="input-phone"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website (Optional)
              </label>
              <input
                {...form.register("websiteUrl")}
                type="url"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="https://yourbusiness.com"
                data-testid="input-website"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Range
              </label>
              <input
                {...form.register("priceRange")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., $100-500, Contact for quote"
                data-testid="input-price-range"
              />
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-gray-900">Professional Details</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Areas (comma-separated)
              </label>
              <input
                {...form.register("serviceAreas" as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Auckland, Wellington, Christchurch"
                data-testid="input-service-areas"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Services Offered (comma-separated)
              </label>
              <input
                {...form.register("servicesOffered" as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Property photography, Aerial shots, Virtual tours"
                data-testid="input-services-offered"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                License Number (if applicable)
              </label>
              <input
                {...form.register("licenseNumber")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Professional license number"
                data-testid="input-license-number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Insurance Details
              </label>
              <textarea
                {...form.register("insuranceDetails")}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Professional indemnity insurance details..."
                data-testid="textarea-insurance"
              />
            </div>
          </div>
        </div>

        {/* Terms and Submit */}
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
          <div className="text-sm text-purple-800 mb-4">
            <h3 className="font-semibold mb-2">Review Process</h3>
            <ul className="space-y-1 text-purple-700">
              <li>• Your application will be reviewed within 2-3 business days</li>
              <li>• We verify business details and professional credentials</li>
              <li>• Once approved, your listing goes live immediately</li>
              <li>• You'll receive email updates on your application status</li>
            </ul>
          </div>
          
          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-submit-application"
          >
            {submitMutation.isPending ? "Submitting..." : "Submit Application"}
          </button>
        </div>
      </form>
    </div>
  );
}