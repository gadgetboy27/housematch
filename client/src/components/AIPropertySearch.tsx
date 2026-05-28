// ============================================
// 🚀 HouseMatch.nz - AI Property Search Component
// ============================================

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, 
  Search, 
  MapPin, 
  Bed, 
  Bath, 
  DollarSign, 
  Loader2,
  TrendingUp,
  Brain,
  FileText,
  Building,
  ArrowRight,
  Target,
  Star,
  Zap,
  Home
} from "lucide-react";

// ============================================
// TYPE DEFINITIONS
// ============================================

interface AISearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PropertyResult {
  id: string;
  title: string;
  address: string;
  suburb: string;
  price: string;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string;
  imageUrl: string | null;
  description: string | null;
  
  // Proprietary match scores
  matchScore: number;
  baseMatchScore: number;
  lifestyleScore: number;
  valueScore: number;
  preferenceScore: number;
  confidence: number;
  matchReasons: string[];
  recommendedReports?: ReportRecommendation[];
}

interface ReportRecommendation {
  type: string;
  name: string;
  price: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  savings?: string | null;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function AIPropertySearch({ open, onOpenChange }: AISearchProps) {
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<PropertyResult | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Update document title when sheet opens
  useEffect(() => {
    if (open) {
      document.title = "AI Property Search - Housematch.nz";
      
      return () => {
        // Restore to home page title
        document.title = "Housematch.nz - Swipe Your Way to Your Dream Home";
      };
    }
  }, [open]);

  // AI Search mutation
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("POST", "/api/ai/search-properties", { query });
      return response.json() as Promise<{ properties: PropertyResult[]; count: number }>;
    },
    onSuccess: (data) => {
      if (data.count === 0) {
        toast({
          title: "No matches found",
          description: "Try adjusting your search criteria",
          variant: "default",
        });
      } else {
        toast({
          title: `Found ${data.count} properties!`,
          description: "Sorted by match score",
          variant: "default",
        });
      }
    },
    onError: (error) => {
      console.error("AI search error:", error);
      toast({
        title: "Search failed",
        description: "Please try again with a different query",
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Enter a search query",
        description: "Try something like '3 bed house under $800k in Auckland'",
        variant: "default",
      });
      return;
    }
    searchMutation.mutate(searchQuery);
  };

  const handleViewProperty = (propertyId: string) => {
    onOpenChange(false);
    setLocation(`/property/${propertyId}`);
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-blue-600 dark:text-blue-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const getMatchScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-500">Excellent Match</Badge>;
    if (score >= 60) return <Badge className="bg-blue-500">Good Match</Badge>;
    if (score >= 40) return <Badge className="bg-yellow-500">Fair Match</Badge>;
    return <Badge variant="secondary">Low Match</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-2xl overflow-y-auto bg-gradient-to-br from-white to-blue-50 dark:from-gray-950 dark:to-blue-950"
      >
        <SheetHeader className="space-y-3">
          <SheetTitle className="flex items-center gap-2 text-2xl">
            🧠You're the Agent 
          </SheetTitle>
          <SheetDescription className="text-base">
            We are the tool box-NZ's best DIY property buy/sell app!🏠✨
          </SheetDescription>
        </SheetHeader>

        {/* Search Input */}
        <div className="mt-6 space-y-4">
          <div className="relative">
            <Input
              data-testid="input-ai-search"
              placeholder="E.g., 3 bed house under $800k in Auckland"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pr-12 h-12 text-base border-2 border-purple-200 dark:border-purple-800 focus:border-purple-500"
            />
            <Search className="absolute right-3 top-3 h-6 w-6 text-gray-400" />
          </div>
          
          <Button
            data-testid="button-search"
            onClick={handleSearch}
            disabled={searchMutation.isPending}
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold"
          >
            {searchMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Search with AI
              </>
            )}
          </Button>

          {/* Example Queries */}
          <div className="flex flex-wrap gap-2">
            <p className="w-full text-xs text-gray-600 dark:text-gray-400">Try these:</p>
            {[
              "3 bed house under $800k",
              "Modern apartment in Auckland",
              "Family home with garden"
            ].map((example) => (
              <button
                key={example}
                data-testid={`button-example-${example.split(' ')[0]}`}
                onClick={() => setSearchQuery(example)}
                className="text-xs px-3 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {searchMutation.isPending && (
          <div className="mt-8 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-600" />
            <p className="text-gray-600 dark:text-gray-400">Analyzing properties with AI...</p>
          </div>
        )}

        {searchMutation.isSuccess && searchMutation.data && (
          <ScrollArea className="mt-6 h-[calc(100vh-300px)]">
            <div className="space-y-4 pr-4">
              {searchMutation.data.properties.map((property) => (
                <Card 
                  key={property.id}
                  data-testid={`card-property-${property.id}`}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-purple-300 dark:hover:border-purple-700"
                  onClick={() => handleViewProperty(property.id)}
                >
                  <div className="relative">
                    {property.imageUrl && (
                      <img 
                        src={property.imageUrl} 
                        alt={property.title}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    {!property.imageUrl && (
                      <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                        <Home className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      {getMatchScoreBadge(property.matchScore)}
                    </div>
                    <div className="absolute top-3 left-3 bg-white dark:bg-gray-900 px-3 py-1 rounded-full shadow-lg">
                      <span className={`text-xl font-bold ${getMatchScoreColor(property.matchScore)}`}>
                        {Math.round(property.matchScore)}%
                      </span>
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-lg line-clamp-1">{property.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {property.suburb}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-green-600 dark:text-green-400">
                        {property.price}
                      </span>
                      <div className="flex items-center gap-4 text-sm">
                        {property.bedrooms && (
                          <span className="flex items-center gap-1">
                            <Bed className="h-4 w-4" />
                            {property.bedrooms}
                          </span>
                        )}
                        {property.bathrooms && (
                          <span className="flex items-center gap-1">
                            <Bath className="h-4 w-4" />
                            {property.bathrooms}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Match Reasons */}
                    {property.matchReasons && property.matchReasons.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          Why this matches:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {property.matchReasons.slice(0, 3).map((reason, idx) => (
                            <Badge 
                              key={idx} 
                              variant="secondary" 
                              className="text-xs"
                            >
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended Reports */}
                    {property.recommendedReports && property.recommendedReports.length > 0 && (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1 mb-2">
                          <FileText className="h-3 w-3" />
                          Recommended reports:
                        </p>
                        <div className="space-y-1">
                          {property.recommendedReports.slice(0, 2).map((report, idx) => (
                            <div 
                              key={idx}
                              className="text-xs flex items-center justify-between bg-blue-50 dark:bg-blue-950 p-2 rounded"
                            >
                              <span className="font-medium">{report.name}</span>
                              <span className="text-green-600 dark:text-green-400 font-bold">
                                ${(report.price / 100).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button 
                      data-testid={`button-view-${property.id}`}
                      className="w-full mt-2"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewProperty(property.id);
                      }}
                    >
                      View Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}

        {searchMutation.isSuccess && searchMutation.data?.count === 0 && (
          <div className="mt-12 text-center space-y-4">
            <div className="text-6xl">🔍</div>
            <h3 className="text-xl font-semibold">No properties found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try broadening your search criteria
            </p>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-semibold text-purple-900 dark:text-purple-100">
                AI-Powered Smart Matching
              </p>
              <p className="text-purple-700 dark:text-purple-300">
                Match scores are calculated using proprietary algorithms analyzing 
                property features, location, price, and your personal preferences.
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
