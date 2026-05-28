import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Clock, DollarSign, Package, TrendingUp, XCircle } from "lucide-react";
import { Link } from "wouter";

export default function PartnerDashboard() {
  // Fetch auth status to get partner data
  const { data: authStatus } = useQuery({
    queryKey: ["/partner/auth/status"],
  });

  const partnerUser = authStatus?.user;
  
  // Fetch full partner details to get accountType
  const { data: partnerData } = useQuery({
    queryKey: ["/api/partners", partnerUser?.partnerId],
    enabled: !!partnerUser?.partnerId,
  });

  // Fetch partner analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/partner/analytics"],
    enabled: !!partnerUser?.partnerId,
  });

  // Fetch recent orders (only for service partners)
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/partner/orders"],
    enabled: !!partnerUser?.partnerId && partnerData?.accountType !== 'preferred_client',
  });

  const partner = partnerUser;
  const accountType = partnerData?.accountType || 'service_partner';
  const isPreferredClient = accountType === 'preferred_client';

  if (!partner) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Not Authenticated</CardTitle>
            <CardDescription>Please log in to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/partner/login">
              <Button className="w-full" data-testid="button-login">
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get verification status badge
  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" data-testid="badge-verified">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" data-testid="badge-rejected">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" data-testid="badge-pending">
            <Clock className="w-3 h-3 mr-1" />
            Pending Verification
          </Badge>
        );
    }
  };

  const recentOrders = orders?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-dashboard-title">
              Partner Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Welcome back, {partner.name}
            </p>
          </div>
          {getVerificationBadge(partner.verificationStatus || 'pending')}
        </div>

        {/* Verification Alert */}
        {partner.verificationStatus === 'pending' && (
          <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950" data-testid="alert-pending-verification">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              Your account is pending verification. You'll be able to accept orders once approved by our admin team.
            </AlertDescription>
          </Alert>
        )}

        {partner.verificationStatus === 'rejected' && partner.verificationNotes && (
          <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950" data-testid="alert-rejected">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              <strong>Verification Rejected:</strong> {partner.verificationNotes}
            </AlertDescription>
          </Alert>
        )}

        {/* Account Type Badge */}
        <Badge className="w-fit" variant={isPreferredClient ? "secondary" : "default"} data-testid="badge-account-type">
          {isPreferredClient ? "💎 Preferred Client" : "🤝 Service Partner"}
        </Badge>

        {/* Stats Grid - Different for each tier */}
        {isPreferredClient ? (
          // PREFERRED CLIENT STATS
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subscription</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="text-subscription-status">
                  {partnerData?.subscriptionStatus === 'active' ? 'Active' : 'Pending'}
                </div>
                <p className="text-xs text-muted-foreground">
                  ${partnerData?.monthlyFee || '99.00'}/month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-referrals">
                  {partnerData?.totalReferrals || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Lifetime client referrals
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Services Listed</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-services-count">
                  {partnerData?.serviceTypes?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active service categories
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Next Billing</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold" data-testid="text-next-billing">
                  {partnerData?.currentPeriodEnd 
                    ? new Date(partnerData.currentPeriodEnd).toLocaleDateString() 
                    : 'Pending'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Subscription renewal
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          // SERVICE PARTNER STATS
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-jobs">
                  {analyticsLoading ? "..." : analytics?.totalJobs || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.completedJobs || 0} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-orders">
                  {analyticsLoading ? "..." : (analytics?.inProgressJobs || 0) + (analytics?.pendingJobs || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.pendingJobs || 0} pending acceptance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-avg-rating">
                  {analyticsLoading ? "..." : analytics?.averageRating ? parseFloat(analytics.averageRating).toFixed(1) : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.totalReviews || 0} reviews
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-earnings">
                  {analyticsLoading ? "..." : `$${((analytics?.totalEarnings || 0) / 100).toFixed(2)}`}
                </div>
                <p className="text-xs text-muted-foreground">
                  After {partnerData?.commissionRate || '10'}% platform fee
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Orders - Service Partners Only */}
        {!isPreferredClient && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Your latest service requests</CardDescription>
                </div>
                <Link href="/partner/orders">
                  <Button variant="outline" size="sm" data-testid="button-view-all-orders">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <p className="text-center text-gray-500 py-8">Loading orders...</p>
              ) : recentOrders.length === 0 ? (
                <p className="text-center text-gray-500 py-8" data-testid="text-no-orders">No orders yet</p>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order: any) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      data-testid={`order-${order.id}`}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{order.serviceName}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {order.customerName} • {order.propertyAddress || "No address"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          order.status === 'completed' ? 'default' :
                          order.status === 'in_progress' ? 'secondary' :
                          order.status === 'cancelled' ? 'destructive' :
                          'outline'
                        } data-testid={`badge-status-${order.id}`}>
                          {order.status}
                        </Badge>
                        <span className="font-semibold">${(order.priceCents / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Preferred Client Info */}
        {isPreferredClient && (
          <Card>
            <CardHeader>
              <CardTitle>Subscription Benefits</CardTitle>
              <CardDescription>Your Preferred Client membership includes</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Premium Listing</div>
                    <div className="text-sm text-gray-600">Featured placement on HouseMatch platform</div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Direct Client Referrals</div>
                    <div className="text-sm text-gray-600">We send clients directly to you for specialized services</div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium">No Platform Fees</div>
                    <div className="text-sm text-gray-600">Keep 100% of your earnings from referred clients</div>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Priority Support</div>
                    <div className="text-sm text-gray-600">Dedicated support for your business needs</div>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
