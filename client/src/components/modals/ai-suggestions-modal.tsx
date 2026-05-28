import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AISuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AISuggestionsModal({ isOpen, onClose }: AISuggestionsModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const { toast } = useToast();

  // Get authenticated user
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const userId = user?.id;

  const { data: marketInsights = [] } = useQuery({
    queryKey: ["/api/ai/market-insights"],
    enabled: isOpen,
  });

  const { data: recommendations = [], refetch: refetchRecommendations } = useQuery({
    queryKey: ["/api/ai/recommendations"],
    enabled: isOpen && !!insights,
  });

  const analyzePreferencesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/analyze-preferences", { userId });
      return response.json();
    },
    onSuccess: (data) => {
      setInsights(data);
      refetchRecommendations();
      toast({
        title: "Analysis Complete",
        description: "AI has analyzed your preferences successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed", 
        description: error.message || "Failed to analyze preferences",
        variant: "destructive",
      });
    },
  });

  const generateRecommendationsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/recommendations", { userId });
      return response.json();
    },
    onSuccess: () => {
      refetchRecommendations();
    },
  });

  const handleAnalyzePreferences = async () => {
    setIsAnalyzing(true);
    try {
      await analyzePreferencesMutation.mutateAsync();
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto max-h-[80vh] overflow-y-auto" data-testid="modal-ai-suggestions">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <i className="fas fa-brain text-white"></i>
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">AI Property Insights</DialogTitle>
              <p className="text-sm text-muted-foreground">Based on your preferences</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {!insights ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-brain text-primary text-2xl"></i>
              </div>
              <h3 className="text-lg font-semibold mb-2">Analyze Your Preferences</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Let AI analyze your swiping patterns to provide personalized recommendations
              </p>
              <Button 
                onClick={handleAnalyzePreferences}
                disabled={isAnalyzing || analyzePreferencesMutation.isPending}
                className="w-full"
                data-testid="button-analyze-preferences"
              >
                {isAnalyzing || analyzePreferencesMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-magic mr-2"></i>
                    Analyze My Preferences
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              {/* AI Analysis Results */}
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
                <h3 className="font-semibold text-primary mb-3">Your Preferences</h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  {insights.preferredPropertyTypes?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="font-medium">Property Types:</span>
                      {insights.preferredPropertyTypes.map((type: string) => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {insights.priceRange && (
                    <p data-testid="text-price-range">
                      <span className="font-medium">Price Range:</span> ${insights.priceRange.min?.toLocaleString()} - ${insights.priceRange.max?.toLocaleString()}
                    </p>
                  )}
                  {insights.preferredLocations?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="font-medium">Locations:</span>
                      {insights.preferredLocations.map((location: string) => (
                        <Badge key={location} variant="outline" className="text-xs">
                          {location}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {insights.dislikes?.length > 0 && (
                    <div>
                      <span className="font-medium">Avoids:</span>
                      <ul className="list-disc list-inside ml-2">
                        {insights.dislikes.map((dislike: string, index: number) => (
                          <li key={index} className="text-xs">{dislike}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Recommended Properties */}
              {recommendations.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Recommended for You</h3>
                  
                  {recommendations.slice(0, 3).map((property: any) => (
                    <Card key={property.id} className="overflow-hidden" data-testid={`card-recommendation-${property.id}`}>
                      <CardContent className="p-0">
                        <div className="flex">
                          <img
                            src={property.imageUrl || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                            alt={property.title}
                            className="w-16 h-16 object-cover"
                            data-testid="img-recommendation"
                          />
                          <div className="flex-1 p-3">
                            <h4 className="font-medium text-secondary" data-testid="text-recommendation-title">
                              {property.title}
                            </h4>
                            <p className="text-sm text-muted-foreground" data-testid="text-recommendation-address">
                              {property.address}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-sm font-semibold text-primary" data-testid="text-recommendation-price">
                                {property.price}
                              </span>
                              {property.matchPercentage && (
                                <Badge className="bg-accent/10 text-accent text-xs" data-testid="badge-match-percentage">
                                  {property.matchPercentage}% match
                                </Badge>
                              )}
                            </div>
                            {property.reasoning && (
                              <p className="text-xs text-muted-foreground mt-1" data-testid="text-recommendation-reasoning">
                                {property.reasoning}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Market Insights */}
              {marketInsights.insights?.length > 0 && (
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Market Insights</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {marketInsights.insights.map((insight: string, index: number) => (
                      <p key={index} data-testid={`text-market-insight-${index}`}>
                        • {insight}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => generateRecommendationsMutation.mutate()}
                  disabled={generateRecommendationsMutation.isPending}
                  data-testid="button-refresh-recommendations"
                >
                  {generateRecommendationsMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : (
                    <i className="fas fa-sync mr-2"></i>
                  )}
                  Refresh
                </Button>
                <Button 
                  className="flex-1"
                  onClick={onClose}
                  data-testid="button-close-ai-modal"
                >
                  Continue Swiping
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
