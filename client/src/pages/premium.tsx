import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Crown, Zap, TrendingUp, Bell, Star } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { PremiumSEO } from "@/components/SEO";

export default function PremiumPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const { data: subscriptionStatus, isLoading: statusLoading } = useQuery<any>({
    queryKey: ["/api/subscription/status"],
    enabled: !!user,
  });

  const { data: plans, isLoading: plansLoading } = useQuery<any[]>({
    queryKey: ["/api/subscription/plans"],
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest("POST", `/api/subscription/create-checkout`, {
        planId,
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to create checkout session");
      }
      
      return data;
    },
    onSuccess: (data: any) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/subscription/cancel`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to cancel subscription");
      }
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription will remain active until the end of your billing period.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  const isPremium = subscriptionStatus?.hasPremium;
  const premiumPlan = plans?.find((p: any) => p.tier === "premium");

  if (!user) {
    return (
      <>
        <PremiumSEO />
        <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Premium Membership</CardTitle>
            <CardDescription>Please log in to access premium features</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setLocation("/")} data-testid="button-go-home">
              Go to Home
            </Button>
          </CardFooter>
        </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PremiumSEO />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Crown className="w-12 h-12 text-yellow-500 mr-3" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Premium Membership
          </h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Unlock advanced features and save money on property reports
        </p>
      </div>

      {/* Current Status */}
      {isPremium && (
        <Card className="mb-8 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200" data-testid="card-premium-status">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Sparkles className="w-6 h-6 text-purple-600 mr-2" />
                <CardTitle>Active Premium Member</CardTitle>
              </div>
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Next billing date: {new Date(subscriptionStatus.subscriptionEndDate).toLocaleDateString()}
              </p>
              <p className="text-sm font-medium">
                Title Search Credits: {subscriptionStatus.titleSearchCredits} / 2 remaining this month
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              onClick={() => cancelSubscriptionMutation.mutate()}
              disabled={cancelSubscriptionMutation.isPending}
              data-testid="button-cancel-subscription"
            >
              {cancelSubscriptionMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* High-Value User Banner */}
      {!isPremium && user?.isHighValueUser && (
        <Card className="mb-8 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300" data-testid="card-high-value-banner">
          <CardHeader>
            <div className="flex items-center">
              <Star className="w-6 h-6 text-yellow-600 mr-2" />
              <CardTitle>You're a Power User!</CardTitle>
            </div>
            <CardDescription>
              Based on your AI usage (${Number(user.totalAiSpending || 0).toFixed(2)} spent), you're getting great value. 
              Upgrade to Premium and get it all for just $29/month!
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Premium Plan Card */}
      {!statusLoading && !plansLoading && premiumPlan && (
        <Card className="mb-8" data-testid="card-premium-plan">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{premiumPlan.name}</CardTitle>
                <CardDescription>{premiumPlan.description}</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">${(premiumPlan.price / 100).toFixed(0)}</div>
                <div className="text-sm text-muted-foreground">NZD/month</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-3">
                <div className="flex items-start">
                  <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">2 Free Title Searches per Month</p>
                    <p className="text-sm text-muted-foreground">Worth $30 - more than the subscription cost!</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Zap className="w-5 h-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Priority AI Recommendations</p>
                    <p className="text-sm text-muted-foreground">Get the best property matches first</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <TrendingUp className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Advanced Property Insights</p>
                    <p className="text-sm text-muted-foreground">Deep market analysis and trends</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Bell className="w-5 h-5 text-orange-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Premium Support</p>
                    <p className="text-sm text-muted-foreground">Priority assistance when you need it</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Star className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Early Access to New Features</p>
                    <p className="text-sm text-muted-foreground">Be the first to try new tools</p>
                  </div>
                </div>
              </div>

              {!isPremium && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-900">
                    💡 Smart Value: At just $29/month, the 2 free title searches alone (worth $30) make this a no-brainer!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          {!isPremium && (
            <CardFooter>
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                size="lg"
                onClick={() => createCheckoutMutation.mutate(premiumPlan.id)}
                disabled={createCheckoutMutation.isPending}
                data-testid="button-upgrade-premium"
              >
                {createCheckoutMutation.isPending ? "Loading..." : "Upgrade to Premium"}
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {/* FAQ / Info */}
      <Card data-testid="card-faq">
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-1">Can I cancel anytime?</h3>
            <p className="text-sm text-muted-foreground">
              Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">How do title search credits work?</h3>
            <p className="text-sm text-muted-foreground">
              You get 2 free title searches each month. They don't roll over, so use them before your next billing date!
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">Is GST included?</h3>
            <p className="text-sm text-muted-foreground">
              The $29 price is before GST. After we reach $60K annual revenue, GST will be added ($33.35/month total).
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
