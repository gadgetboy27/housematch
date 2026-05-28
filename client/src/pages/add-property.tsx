import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { insertPropertySchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePageTracking, useTrackForm } from "@/components/Analytics";
import BottomNavigation from "@/components/bottom-navigation";
import { Badge } from "@/components/ui/badge";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ObjectUploader } from "@/components/ObjectUploader";
import { AuthModal } from "@/components/auth-modal";
import { PricingSelection } from "@/components/pricing-selection";
import { EarlyBirdBanner } from "@/components/early-bird-banner";
import type { UploadResult } from "@uppy/core";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyUploadResult = UploadResult<any, any>;
import { z } from "zod";
import { getRegionOptions } from "@shared/nzRegions";
import { Sparkles, Home, DollarSign, MapPin, Building, Upload, CheckCircle2, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const propertyTypeOptions = [
  { value: "residential", label: "Residential", icon: "🏠", color: "from-blue-500 to-blue-600" },
  { value: "rental", label: "Rental", icon: "🔑", color: "from-green-500 to-green-600" },
  { value: "commercial", label: "Commercial", icon: "🏢", color: "from-orange-500 to-orange-600" },
  { value: "lease", label: "Lease", icon: "🤝", color: "from-purple-500 to-purple-600" },
  { value: "farm", label: "Farm", icon: "🚜", color: "from-yellow-500 to-yellow-600" },
  { value: "batch", label: "Batch", icon: "⛰️", color: "from-pink-500 to-pink-600" },
  { value: "land", label: "Land", icon: "🌍", color: "from-emerald-500 to-emerald-600" },
  { value: "apartment", label: "Apartment", icon: "🏛️", color: "from-cyan-500 to-cyan-600" },
];

const zoningOptions = [
  "Residential",
  "Residential Mixed Use",
  "Commercial",
  "Industrial",
  "Rural",
];

export default function AddProperty() {
  // Track this page view
  usePageTracking('Add Property Listing', {
    page_category: 'listing',
    user_type: 'property_owner'
  });
  
  // Track form submissions
  const trackForm = useTrackForm();

  const [selectedPropertyType, setSelectedPropertyType] = useState<string>("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedVideo, setUploadedVideo] = useState<string>("");
  const [uploadedAudio, setUploadedAudio] = useState<string>("");
  
  // Upload progress tracking
  const [uploadProgress, setUploadProgress] = useState({
    images: { uploading: false, current: 0, total: 0 },
    video: { uploading: false },
    audio: { uploading: false },
  });
  
  // AI description generator state
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  const [validationStatus, setValidationStatus] = useState<{
    isValidating: boolean;
    isValid: boolean;
    message: string;
    details?: any;
  }>({ isValidating: false, isValid: false, message: '' });
  
  const [fieldValidation, setFieldValidation] = useState({
    lotNumber: { verified: false, loading: false, message: "" },
    address: { verified: false, loading: false, message: "" },
    certificateOfTitle: { verified: false, loading: false, message: "" }
  });

  // LINZ title lookup state
  const [linzData, setLinzData] = useState<any>(null);
  const [isLoadingLinz, setIsLoadingLinz] = useState(false);
  const [linzMatches, setLinzMatches] = useState<any[]>([]);
  const [showLinzSelection, setShowLinzSelection] = useState(false);

  // Authentication state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot-password'>('signup');
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [hasUserDismissedAuthModal, setHasUserDismissedAuthModal] = useState(false);
  
  // Pricing selection state
  const [showPricingSelection, setShowPricingSelection] = useState(false);
  const [selectedPricingPlan, setSelectedPricingPlan] = useState<string>("");
  const [isPricingComplete, setIsPricingComplete] = useState(false);
  
  // Payment flow state
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is authenticated
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/auth/user");
        return response.json();
      } catch (error) {
        return null;
      }
    },
    retry: false,
  });

  useEffect(() => {
    if (user && !currentUser) {
      setCurrentUser(user);
    }
  }, [user, currentUser]);

  useEffect(() => {
    if (user === null && !showAuthModal && !hasUserDismissedAuthModal) {
      setShowAuthModal(true);
      setAuthMode('signup');
    }
  }, [user, showAuthModal]);

  // Create dynamic form schema
  const createFormSchema = (propertyType: string) => {
    const isRentalOrLease = propertyType === 'rental' || propertyType === 'lease';
    
    return z.object({
      title: z.string().min(1, "Title is required"),
      address: z.string().min(1, "Street address is required"),
      suburb: z.string().min(1, "Suburb is required"),
      city: z.string().min(1, "City is required"),
      postcode: z.string().optional(),
      price: z.string().optional(),
      propertyType: z.string().min(1, "Property type is required"),
      bedrooms: z.string().transform(val => parseInt(val) || 0).optional(),
      bathrooms: z.string().transform(val => parseInt(val) || 0).optional(),
      floorArea: z.string().transform(val => parseInt(val) || 0).optional(),
      landArea: z.string().transform(val => parseInt(val) || 0).optional(),
      carSpaces: z.string().transform(val => parseInt(val) || 0).optional(),
      parkingType: z.string().optional(),
      lotNumber: isRentalOrLease 
        ? z.string().optional() 
        : z.string().min(1, "Lot Number is required"),
      certificateOfTitle: isRentalOrLease 
        ? z.string().optional() 
        : z.string().min(1, "Certificate of Title is required"),
      hideCertificateOfTitle: z.boolean().default(false),
      zoning: z.string().optional(),
      yearBuilt: z.string().transform(val => parseInt(val) || new Date().getFullYear()).optional(),
      imageUrl: z.string().min(1, "At least one image is required"),
      videoUrl: z.string().optional(),
      audioUrl: z.string().optional(),
      additionalImages: z.array(z.string()).optional(),
      description: z.string().optional(),
      isLinzValidated: z.boolean().default(false),
      selfDeclaration: z.boolean().refine((val) => val === true, {
        message: "You must confirm the accuracy of the property details",
      }),
    });
  };

  const form = useForm({
    resolver: zodResolver(createFormSchema(selectedPropertyType)),
    defaultValues: {
      title: "",
      address: "",
      suburb: "",
      city: "",
      postcode: "",
      price: "",
      propertyType: "",
      bedrooms: "3",
      bathrooms: "2",
      floorArea: "120",
      landArea: "400",
      carSpaces: "1",
      parkingType: "",
      lotNumber: "",
      certificateOfTitle: "",
      hideCertificateOfTitle: false,
      zoning: "Residential",
      yearBuilt: new Date().getFullYear().toString(),
      imageUrl: "",
      videoUrl: "",
      audioUrl: "",
      additionalImages: [] as string[],
      description: "",
      isLinzValidated: false,
      selfDeclaration: false,
    },
  });

  // Sync selectedPropertyType with form
  useEffect(() => {
    if (selectedPropertyType) {
      form.setValue("propertyType", selectedPropertyType);
      const isRentalOrLease = selectedPropertyType === 'rental' || selectedPropertyType === 'lease';
      if (isRentalOrLease) {
        form.setValue("lotNumber", "");
        form.setValue("certificateOfTitle", "");
      }
      form.trigger();
    }
  }, [selectedPropertyType, form]);

  // Sync uploaded files with form
  useEffect(() => {
    if (uploadedImages.length > 0) {
      form.setValue("imageUrl", uploadedImages[0]);
      
      // Set additional images (if any)
      if (uploadedImages.length > 1) {
        form.setValue("additionalImages", uploadedImages.slice(1));
      }
    }
  }, [uploadedImages, form]);

  useEffect(() => {
    if (uploadedVideo) {
      form.setValue("videoUrl", uploadedVideo);
    }
  }, [uploadedVideo, form]);

  useEffect(() => {
    if (uploadedAudio) {
      form.setValue("audioUrl", uploadedAudio);
    }
  }, [uploadedAudio, form]);

  // Check if property details are complete (for enabling AI generation and title/description)
  const watchedFields = form.watch();
  const isPropertyDetailsComplete = useMemo(() => {
    return !!(
      watchedFields.propertyType &&
      watchedFields.address &&
      watchedFields.suburb &&
      watchedFields.city
    );
  }, [watchedFields]);

  const createPropertyMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("📡 Sending property to API:", data);
      const response = await apiRequest("POST", "/api/properties", data);
      const result = await response.json();
      console.log("📡 API response:", result);
      return result;
    },
    onSuccess: async (data) => {
      console.log("✅ Property created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      
      // Store created property for payment flow
      setCreatedPropertyId(data.id);
      
      // 🎯 EARLY BIRD PROMOTION - Auto-claim if available
      try {
        const statusResponse = await fetch('/api/early-bird/status');
        const earlyBirdStatus = await statusResponse.json();
        
        if (earlyBirdStatus.active && earlyBirdStatus.promotion) {
          console.log("🎉 Early bird promotion is active! Attempting to claim...");
          
          // apiRequest returns a Response object, so we need to parse it
          const claimResponse = await apiRequest("POST", "/api/early-bird/claim", {
            propertyId: data.id,
            promotionId: earlyBirdStatus.promotion.id
          });
          
          // Parse the JSON response
          const claimResult = await claimResponse.json();
          console.log("✅ Early bird claim response:", claimResult);
          
          // Check if claim was successful (backend returns success: true)
          if (claimResult.success) {
            // Invalidate early bird status to update banner
            queryClient.invalidateQueries({ queryKey: ['/api/early-bird/status'] });
            
            toast({
              title: "🎉 FREE Listing Activated!",
              description: claimResult.message || `Congratulations! You're one of the first 100 - no payment required!`,
              duration: 8000,
            });
            
            // Skip pricing modal - listing is FREE!
            setTimeout(() => {
              setLocation("/");
            }, 2000);
            
            return; // Exit early, no pricing needed
          } else {
            console.log("Early bird claim unsuccessful, proceeding with normal flow");
          }
        }
      } catch (error) {
        console.log("Early bird claim failed or not available, proceeding with normal flow:", error);
        // Continue to normal pricing flow
      }
      
      // Normal flow: Show pricing selection modal
      toast({
        title: "Property Created! 🎉",
        description: "Now select a listing plan to activate your property.",
      });
      
      setShowPricingModal(true);
    },
    onError: (error: any) => {
      console.error("❌ Error creating property:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add property. Please try again.",
        variant: "destructive",
      });
    },
  });

  // AI-powered description and title generator
  const generateAIContent = async () => {
    setIsGeneratingAI(true);
    
    try {
      const formData = form.getValues();
      
      const propertyData = {
        propertyType: formData.propertyType,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : undefined,
        address: formData.address,
        suburb: formData.suburb,
        city: formData.city,
        price: formData.price,
        floorArea: formData.floorArea ? parseInt(formData.floorArea) : undefined,
        landArea: formData.landArea ? parseInt(formData.landArea) : undefined,
        yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : undefined,
        zoning: formData.zoning,
        parkingType: formData.parkingType,
        carSpaces: formData.carSpaces ? parseInt(formData.carSpaces) : undefined,
      };
      
      console.log('🤖 Generating AI content for property:', propertyData);
      
      const response = await apiRequest("POST", "/api/ai/generate-description", propertyData);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || errorData.error || 'Failed to generate AI content');
      }
      
      const result = await response.json();
      
      console.log('✅ AI content generated:', result);
      
      if (!result.title || !result.description) {
        throw new Error('Invalid response from AI service - missing content');
      }
      
      form.setValue('title', result.title);
      form.setValue('description', result.description);
      
      toast({
        title: "AI Content Generated! ✨",
        description: "Professional title and description created. Feel free to edit as needed.",
      });
    } catch (error: any) {
      console.error('❌ AI generation failed:', error);
      
      toast({
        title: "AI Generation Failed",
        description: error.message || "Unable to generate AI content. Please try again or write manually.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Price formatting
  const formatPrice = (value: string): string => {
    const numericValue = value.replace(/[^\d.]/g, '');
    if (!numericValue) return '';
    
    const number = parseFloat(numericValue);
    if (isNaN(number)) return value;
    
    const formatted = number.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    return formatted;
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
    const rawValue = e.target.value.replace(/[^\d.]/g, '');
    onChange(rawValue);
  };

  // Handle LINZ title selection
  const handleLinzTitleSelect = (match: any) => {
    setLinzData(match);
    form.setValue('certificateOfTitle', match.titleNumber);
    form.setValue('lotNumber', match.legalDescription);
    form.setValue('isLinzValidated', true);
    setShowLinzSelection(false);
    
    toast({
      title: "LINZ Title Selected ✓",
      description: `Title: ${match.titleNumber}`,
    });
  };

  // NEW: Coordinate-based LINZ verification with 2-step process
  const fetchLinzTitle = async () => {
    setIsLoadingLinz(true);
    try {
      const address = form.getValues('address');
      const city = form.getValues('city');
      
      if (!address || !city) {
        toast({
          title: "Missing Information",
          description: "Please fill in street address and city first",
          variant: "destructive",
        });
        setIsLoadingLinz(false);
        return;
      }

      console.log('🔍 Verifying address with LINZ:', { address, city });
      
      // Call new coordinate-based verification endpoint
      const response = await apiRequest("POST", "/api/linz/verify-address", { 
        address, 
        city 
      });
      const data = await response.json();
      
      console.log('📡 LINZ response:', data);
      
      if (data.success) {
        // Success - auto-fill lot number and certificate of title
        const lotNumber = data.lotNumber || '';
        const titleNumber = data.titleNumber || '';
        
        form.setValue('lotNumber', lotNumber);
        form.setValue('certificateOfTitle', titleNumber);
        form.setValue('isLinzValidated', true);
        
        toast({
          title: "✅ Address Verified with LINZ!",
          description: `Title: ${titleNumber} | Lot: ${lotNumber}`,
        });
        
        console.log('✅ Auto-filled:', { lotNumber, titleNumber });
      } else {
        // Failed - show appropriate error message
        const errorMessage = data.message || 'Could not verify address with LINZ';
        
        if (data.error === 'Address not found') {
          toast({
            title: "⚠️ Address Not Found",
            description: "The address could not be found in LINZ database. Please check spelling or enter title info manually.",
            variant: "destructive",
          });
        } else if (data.error === 'No title found') {
          toast({
            title: "⚠️ No Title Found",
            description: "Address found but no title registered. This may be Crown land. Please enter title info manually.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "⚠️ LINZ Verification Failed",
            description: errorMessage,
            variant: "destructive",
          });
        }
        
        console.warn('⚠️ LINZ verification failed:', data);
      }
    } catch (error: any) {
      console.error('❌ LINZ verification error:', error);
      toast({
        title: "Error",
        description: "Failed to connect to LINZ. Please enter lot number and certificate manually.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLinz(false);
    }
  };

  // Handle image uploads
  const handleImagesUploaded = async (results: AnyUploadResult[]) => {
    console.log('📸 Images uploaded:', results);
    
    if (results.length > 0) {
      const successfulUploads = results.filter((result) => result.successful && result.successful.length > 0);
      
      if (successfulUploads.length > 0) {
        const imageUrls = successfulUploads.flatMap((result) =>
          result.successful?.map((file: any) => file.uploadURL) || []
        );
        
        setUploadedImages(imageUrls);
        form.setValue('imageUrl', imageUrls[0]);
        
        toast({
          title: "Images Uploaded ✓",
          description: `${imageUrls.length} image(s) uploaded successfully`,
        });
      }
    }
  };

  const handleVideoUploaded = async (results: AnyUploadResult[]) => {
    if (results.length > 0 && results[0].successful && results[0].successful.length > 0) {
      const videoUrl = results[0].successful[0].uploadURL || '';
      setUploadedVideo(videoUrl);
      form.setValue('videoUrl', videoUrl);
      
      toast({
        title: "Video Uploaded ✓",
        description: "Property video tour uploaded successfully",
      });
    }
  };

  const handleAudioUploaded = async (results: AnyUploadResult[]) => {
    if (results.length > 0 && results[0].successful && results[0].successful.length > 0) {
      const audioUrl = results[0].successful[0].uploadURL || '';
      setUploadedAudio(audioUrl);
      form.setValue('audioUrl', audioUrl);
      
      toast({
        title: "Audio Uploaded ✓",
        description: "Property audio description uploaded successfully",
      });
    }
  };

  const handleUploadProgress = (files: any[]) => {
    // ObjectUploader passes an array of URL strings when files are uploaded
    // We consider all files in the array as uploaded
    const totalFiles = files.length;
    const uploadedFiles = files.length; // All files in array are uploaded
    
    setUploadProgress(prev => ({
      ...prev,
      images: {
        uploading: false, // Upload is complete when this callback is called
        current: uploadedFiles,
        total: totalFiles,
      }
    }));
  };

  // Handle pricing plan selection and Stripe checkout
  const handleSelectPlan = async (plan: any) => {
    if (!createdPropertyId) {
      toast({
        title: "Error",
        description: "Property ID not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("💳 Creating Stripe checkout for property:", createdPropertyId, "with plan:", plan.id);
      
      const response = await apiRequest("POST", "/api/stripe/create-checkout-session", {
        planId: plan.id,
        planType: 'listing',
        metadata: {
          propertyId: createdPropertyId,
          userId: user?.id,
        }
      });

      const data = await response.json();
      
      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: any) => {
    console.log("🚀 Form submit triggered!", data);
    console.log("🔐 Current user:", user);
    
    if (!user) {
      console.log("❌ No user, showing auth modal");
      setPendingSubmitData(data);
      setShowAuthModal(true);
      setAuthMode('signup');
      return;
    }

    // Check for at least one image
    if (!uploadedImages.length && !data.imageUrl) {
      toast({
        title: "Image Required",
        description: "Please upload at least one property image",
        variant: "destructive",
      });
      return;
    }

    const propertyData = {
      ...data,
      price: data.price ? formatPrice(data.price) : "$0",
      imageUrl: uploadedImages.length > 0 ? uploadedImages[0] : data.imageUrl,
      additionalImages: uploadedImages.length > 1 ? uploadedImages.slice(1) : [],
      videoUrl: uploadedVideo || data.videoUrl,
      audioUrl: uploadedAudio || data.audioUrl,
    };

    console.log("✅ Submitting property data:", propertyData);
    createPropertyMutation.mutate(propertyData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pb-24">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            List Your Property
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Fill in the details below and let our AI create professional marketing content
          </p>
        </div>

        {/* Early Bird Promotion Banner */}
        <div className="mb-8">
          <EarlyBirdBanner />
        </div>

        <Form {...form}>
          <form 
            onSubmit={(e) => {
              console.log("📝 Form submit event triggered");
              console.log("📝 Form errors:", form.formState.errors);
              form.handleSubmit(onSubmit)(e);
            }} 
            className="space-y-8"
          >
            
            {/* SECTION 1: PROPERTY DETAILS */}
            <Card className="border-2 border-blue-200 dark:border-blue-800 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Home className="w-6 h-6 text-blue-600" />
                  Property Details
                </CardTitle>
                <CardDescription>Tell us about your property</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                
                {/* Property Type */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Property Type *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {propertyTypeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSelectedPropertyType(option.value)}
                        data-testid={`button-property-type-${option.value}`}
                        className={`
                          p-4 rounded-xl border-2 transition-all duration-200
                          flex flex-col items-center gap-2 hover:scale-105
                          ${selectedPropertyType === option.value
                            ? `bg-gradient-to-br ${option.color} text-white border-transparent shadow-lg`
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                          }
                        `}
                      >
                        <span className="text-3xl">{option.icon}</span>
                        <span className="text-sm font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Address Fields */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Property Address *
                    </label>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., 123 Queen Street"
                            {...field}
                            data-testid="input-address"
                            className="text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="suburb"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Suburb</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Auckland CBD"
                              {...field}
                              data-testid="input-suburb"
                              className="text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Auckland"
                              {...field}
                              data-testid="input-city"
                              className="text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="postcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postcode (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., 1010"
                            {...field}
                            data-testid="input-postcode"
                            className="text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Property Specifications */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <Building className="w-5 h-5 text-blue-600" />
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Property Specifications
                    </label>
                  </div>

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (Optional)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                              type="text"
                              placeholder="850,000"
                              {...field}
                              value={field.value ? formatPrice(field.value) : ''}
                              onChange={(e) => handlePriceChange(e, field.onChange)}
                              data-testid="input-price"
                              className="pl-10 text-base"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="bedrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bedrooms</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-bedrooms">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6].map(num => (
                                <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bathrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bathrooms</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-bathrooms">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[1, 2, 3, 4, 5].map(num => (
                                <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="carSpaces"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parking Spaces</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-car-spaces">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[0, 1, 2, 3, 4].map(num => (
                                <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="floorArea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Floor Area (m²)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="120"
                              {...field}
                              data-testid="input-floor-area"
                              className="text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="landArea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Land Area (m²)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="400"
                              {...field}
                              data-testid="input-land-area"
                              className="text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="zoning"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zoning</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-zoning">
                                <SelectValue placeholder="Select zoning" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {zoningOptions.map(zone => (
                                <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="yearBuilt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year Built</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="2020"
                              {...field}
                              data-testid="input-year-built"
                              className="text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SECTION 2: AI MARKETING ASSISTANT */}
            <Card className="border-2 border-purple-200 dark:border-purple-800 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                  AI Marketing Assistant
                </CardTitle>
                <CardDescription>
                  {isPropertyDetailsComplete 
                    ? "Generate professional marketing content based on your property details"
                    : "⚠️ Please fill in property type and address fields above to enable AI generation"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <Button
                  type="button"
                  onClick={generateAIContent}
                  disabled={!isPropertyDetailsComplete || isGeneratingAI}
                  data-testid="button-generate-ai"
                  className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Professional Content...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Title & Description with AI
                    </>
                  )}
                </Button>
                <p className="text-xs text-slate-500 text-center mt-3">
                  Our AI analyzes your property details to create compelling, NZ-market-optimized marketing copy
                </p>
              </CardContent>
            </Card>

            {/* SECTION 3: TITLE & DESCRIPTION */}
            <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">Property Title & Description</CardTitle>
                <CardDescription>
                  {isPropertyDetailsComplete 
                    ? "Review and edit the AI-generated content, or write your own"
                    : "Fill in property details above to enable this section"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Stunning 4BR Family Home in Auckland CBD"
                          {...field}
                          disabled={!isPropertyDetailsComplete}
                          data-testid="input-title"
                          className="text-base disabled:opacity-50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your property's features, location, and unique selling points..."
                          {...field}
                          disabled={!isPropertyDetailsComplete}
                          data-testid="textarea-description"
                          rows={8}
                          className="text-base disabled:opacity-50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* SECTION 4: NZ PROPERTY VERIFICATION */}
            {selectedPropertyType && selectedPropertyType !== 'rental' && selectedPropertyType !== 'lease' && (
              <Card className="border-2 border-emerald-200 dark:border-emerald-800 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950">
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    NZ Property Verification
                  </CardTitle>
                  <CardDescription>
                    Official property verification details for security and authenticity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <Button
                    type="button"
                    onClick={fetchLinzTitle}
                    disabled={isLoadingLinz}
                    variant="outline"
                    className="w-full mb-4"
                  >
                    {isLoadingLinz ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Fetching LINZ Data...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Auto-Fill from LINZ Database
                      </>
                    )}
                  </Button>

                  <FormField
                    control={form.control}
                    name="lotNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Council Lot Number *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Lot 12 DP 123456"
                            {...field}
                            data-testid="input-lot-number"
                            className="text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="certificateOfTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Certificate of Title *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., NA123/456"
                            {...field}
                            data-testid="input-certificate-title"
                            className="text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* SECTION 5: MEDIA UPLOADS */}
            <Card className="border-2 border-orange-200 dark:border-orange-800 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950 dark:to-yellow-950">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Upload className="w-6 h-6 text-orange-600" />
                  Property Media
                </CardTitle>
                <CardDescription>Upload images, video tour, and audio description</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {!user ? (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-dashed">
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      Please sign in to upload property media
                    </p>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowAuthModal(true);
                        setAuthMode('signup');
                      }}
                      variant="outline"
                    >
                      Sign In / Sign Up
                    </Button>
                  </div>
                ) : user?.id ? (
                  <>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                        Property Images * (up to 4)
                      </label>
                      <ObjectUploader
                        userId={user.id}
                        uploadType="image"
                        onGetUploadParameters={async () => {
                          const response = await apiRequest('POST', '/api/objects/upload');
                          const data = await response.json();
                          return { method: 'PUT' as const, url: data.uploadURL };
                        }}
                        onComplete={async (files) => {
                          console.log("📸 onComplete called with files:", files);
                          
                          if (!files || files.length === 0) {
                            console.error("❌ No files received from upload");
                            toast({
                              title: "Upload Error",
                              description: "No files were uploaded. Please try again.",
                              variant: "destructive",
                            });
                            return;
                          }

                          console.log(`📤 Processing ${files.length} uploaded file(s)...`);

                          try {
                            const normalizedPaths: string[] = [];
                            
                            // Process each uploaded file through the backend to normalize the path
                            for (let i = 0; i < files.length; i++) {
                              const imageURL = files[i];
                              console.log(`🔄 [${i+1}/${files.length}] Processing:`, imageURL);
                              
                              try {
                                // Normalize the GCS URL to a clean path
                                const response = await apiRequest("PUT", "/api/property-images", { imageURL });
                                
                                if (!response.ok) {
                                  const errorText = await response.text();
                                  console.error(`❌ Backend processing failed for image ${i+1}:`, errorText);
                                  throw new Error(`Backend returned ${response.status}`);
                                }
                                
                                const data = await response.json();
                                console.log(`✅ [${i+1}/${files.length}] Normalized path:`, data.objectPath);
                                normalizedPaths.push(data.objectPath);
                              } catch (error) {
                                console.error(`❌ Failed to process image ${i+1}:`, error);
                                // Continue processing other images
                              }
                            }
                            
                            if (normalizedPaths.length > 0) {
                              console.log('📸 Setting uploadedImages state:', normalizedPaths);
                              setUploadedImages(normalizedPaths);
                              
                              // Set first image as main image
                              form.setValue('imageUrl', normalizedPaths[0]);
                              
                              // Set remaining images as additional images
                              if (normalizedPaths.length > 1) {
                                const additionalImages = normalizedPaths.slice(1);
                                form.setValue('additionalImages', additionalImages);
                                console.log("📸 Set additionalImages:", additionalImages);
                              }
                              
                              console.log("📸 Form values after upload:", {
                                imageUrl: normalizedPaths[0],
                                additionalImages: normalizedPaths.slice(1)
                              });
                              
                              toast({
                                title: "Success! ✓",
                                description: `${normalizedPaths.length} image(s) uploaded successfully`,
                              });
                            } else {
                              console.error('❌ No images were successfully processed');
                              toast({
                                title: "Processing Error", 
                                description: "Failed to process uploaded images. Please check console.",
                                variant: "destructive",
                              });
                            }
                          } catch (error) {
                            console.error('❌ Upload completion error:', error);
                            toast({
                              title: "Error",
                              description: error instanceof Error ? error.message : "Failed to complete upload",
                              variant: "destructive",
                            });
                          }
                        }}
                        onUploadProgress={handleUploadProgress}
                        maxNumberOfFiles={10}
                        allowedFileTypes={['image/*']}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Images
                      </ObjectUploader>
                      {uploadProgress.images.uploading && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading {uploadProgress.images.current} of {uploadProgress.images.total} images...
                        </div>
                      )}
                      {uploadedImages.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            {uploadedImages.length} image(s) uploaded successfully
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {uploadedImages.map((url, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={url}
                                  alt={`Property image ${index + 1}`}
                                  className="w-full h-24 md:h-32 object-cover rounded-lg border-2 border-green-500"
                                />
                                <div className="absolute top-1 right-1 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                                  {index === 0 ? 'Main' : `#${index + 1}`}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                        Property Video Tour (Optional)
                      </label>
                      <ObjectUploader
                        userId={user.id}
                        uploadType="video"
                        onGetUploadParameters={async () => {
                          const response = await apiRequest('POST', '/api/objects/upload');
                          const data = await response.json();
                          return { method: 'PUT' as const, url: data.uploadURL };
                        }}
                        onComplete={async (files) => {
                          if (files.length > 0) {
                            setUploadedVideo(files[0]);
                            form.setValue('videoUrl', files[0]);
                            toast({
                              title: "Video Uploaded ✓",
                              description: "Property video tour uploaded successfully",
                            });
                          }
                        }}
                        maxNumberOfFiles={1}
                        allowedFileTypes={['video/*']}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Video
                      </ObjectUploader>
                      {uploadedVideo && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          Video uploaded successfully
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                        Audio Description (Optional)
                      </label>
                      <ObjectUploader
                        userId={user.id}
                        uploadType="audio"
                        onGetUploadParameters={async () => {
                          const response = await apiRequest('POST', '/api/objects/upload');
                          const data = await response.json();
                          return { method: 'PUT' as const, url: data.uploadURL };
                        }}
                        onComplete={async (files) => {
                          if (files.length > 0) {
                            setUploadedAudio(files[0]);
                            form.setValue('audioUrl', files[0]);
                            toast({
                              title: "Audio Uploaded ✓",
                              description: "Property audio description uploaded successfully",
                            });
                          }
                        }}
                        maxNumberOfFiles={1}
                        allowedFileTypes={['audio/*']}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Audio
                      </ObjectUploader>
                      {uploadedAudio && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          Audio uploaded successfully
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            {/* SECTION 6: FINAL SUBMISSION */}
            <Card className="border-2 border-green-200 dark:border-green-800 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
                <CardTitle className="text-2xl">Final Checks & Submit</CardTitle>
                <CardDescription>Verify your information and submit your listing</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <FormField
                  control={form.control}
                  name="selfDeclaration"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 bg-slate-50 dark:bg-slate-900">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-self-declaration"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-base font-medium">
                          I confirm that all property details are accurate *
                        </FormLabel>
                        <p className="text-sm text-slate-500">
                          I declare that the information provided is true and accurate to the best of my knowledge
                        </p>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={createPropertyMutation.isPending}
                  data-testid="button-submit-property"
                  className="w-full h-14 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
                >
                  {createPropertyMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Submitting Property...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Submit Property Listing
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>

      <BottomNavigation />

      {/* Authentication Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            setHasUserDismissedAuthModal(true);
          }}
          mode={authMode}
          onSuccess={(userData) => {
            setCurrentUser(userData);
            setShowAuthModal(false);
            
            if (pendingSubmitData) {
              const propertyData = {
                ...pendingSubmitData,
                price: pendingSubmitData.price?.replace(/[^\d.]/g, '') || "0",
                imageUrl: uploadedImages.length > 0 ? uploadedImages[0] : pendingSubmitData.imageUrl,
                additionalImages: uploadedImages.length > 1 ? uploadedImages.slice(1) : [],
                videoUrl: uploadedVideo || pendingSubmitData.videoUrl,
                audioUrl: uploadedAudio || pendingSubmitData.audioUrl,
              };
              
              createPropertyMutation.mutate(propertyData);
              setPendingSubmitData(null);
            }
          }}
          onToggleMode={() => {
            setAuthMode(authMode === 'login' ? 'signup' : 'login');
          }}
        />
      )}

      {/* Pricing Selection Modal */}
      {showPricingSelection && (
        <PricingSelection
          onClose={() => setShowPricingSelection(false)}
          onPlanSelect={(plan) => {
            setSelectedPricingPlan(plan);
            setIsPricingComplete(true);
            setShowPricingSelection(false);
          }}
        />
      )}

      {/* Property Activation Payment Modal */}
      {showPricingModal && (
        <Dialog open={showPricingModal} onOpenChange={setShowPricingModal}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">Activate Your Property Listing</DialogTitle>
              <DialogDescription>
                Your property has been created! Select a plan to make it live on HouseMatch.nz
              </DialogDescription>
            </DialogHeader>
            <PricingSelection
              onClose={() => setShowPricingModal(false)}
              onPlanSelect={handleSelectPlan}
              propertyId={createdPropertyId || undefined}
              userId={user?.id}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* LINZ Title Selection Dialog */}
      <Dialog open={showLinzSelection} onOpenChange={setShowLinzSelection}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Select LINZ Property Title</DialogTitle>
            <DialogDescription>
              We found {linzMatches.length} possible matches for this address. Please select the correct one:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {linzMatches.map((match, index) => (
              <button
                key={index}
                onClick={() => handleLinzTitleSelect(match)}
                className="w-full text-left p-4 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-lg text-blue-600 dark:text-blue-400">
                      {match.titleNumber}
                    </div>
                    <div className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                      {match.legalDescription}
                    </div>
                    <div className="flex gap-3 mt-2 text-xs text-slate-500">
                      <span>District: {match.landDistrict}</span>
                      <span>•</span>
                      <span>Status: {match.status}</span>
                      {match.confidence && (
                        <>
                          <span>•</span>
                          <span>Match: {(match.confidence * 100).toFixed(0)}%</span>
                        </>
                      )}
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-blue-600 opacity-0 group-hover:opacity-100" />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <strong>Can't find the right title?</strong> You can close this dialog and enter the lot number and certificate manually.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
