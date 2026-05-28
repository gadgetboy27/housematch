import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InviteAdminDialog } from "@/components/invite-admin-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  AlertTriangle, 
  DollarSign, 
  Clock, 
  CheckCircle2,
  ArrowRight,
  UserCheck,
  Home,
  LogOut,
  Sparkles
} from "lucide-react";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const { data: pendingPartners = [] } = useQuery<any[]>({
    queryKey: ["/api/partners/pending"],
  });

  const { data: allPartners = [] } = useQuery<any[]>({
    queryKey: ["/api/partners"],
  });

  const { data: unpaidOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/payouts/unpaid"],
  });

  const { data: errors = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/errors"],
  });

  const { data: earlyBird } = useQuery<any>({
    queryKey: ["/api/admin/early-bird"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Logged out successfully",
        description: "You have been logged out.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const activePartners = allPartners.filter((p: any) => p.verificationStatus === 'verified').length;
  const recentErrors = errors.slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white" data-testid="text-admin-dashboard-title">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Welcome back, {user?.name}! Here's what's happening.
            </p>
          </div>
          <div className="flex gap-2">
            <InviteAdminDialog />
            <Link href="/">
              <Button variant="outline" className="gap-2" data-testid="button-back-home">
                <Home className="w-4 h-4" />
                Back to Site
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950" 
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              {logoutMutation.isPending ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800" data-testid="card-pending-partners">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  Pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {pendingPartners.length}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Partners awaiting verification
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-green-200 dark:border-green-800" data-testid="card-active-partners">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <UserCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {activePartners}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Verified service partners
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-orange-200 dark:border-orange-800" data-testid="card-unpaid-orders">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <DollarSign className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
                  Unpaid
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {unpaidOrders.length}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Orders awaiting payout
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-red-200 dark:border-red-800" data-testid="card-errors">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                <Badge variant="secondary" className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                  Issues
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {errors.length}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total errors tracked
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Early Bird Promotion */}
        {earlyBird?.promotion && (
          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border-2 border-yellow-400 dark:border-yellow-600" data-testid="card-early-bird-promotion">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <Sparkles className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-gray-900 dark:text-white">
                      🎉 Early Bird Promotion
                    </CardTitle>
                    <CardDescription className="text-gray-700 dark:text-gray-300">
                      {earlyBird.promotion.name}
                    </CardDescription>
                  </div>
                </div>
                <Badge 
                  variant={earlyBird.promotion.isActive ? "default" : "secondary"}
                  className={earlyBird.promotion.isActive ? "bg-green-500 hover:bg-green-600" : ""}
                >
                  {earlyBird.promotion.isActive ? "ACTIVE" : "INACTIVE"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Used</div>
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {earlyBird.promotion.totalUsed} / {earlyBird.promotion.totalLimit}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Remaining</div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {earlyBird.remaining}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Usage %</div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {earlyBird.percentageUsed}%
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-4">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500"
                    style={{ width: `${earlyBird.percentageUsed}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Dashboards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Partner Management */}
          <Card className="bg-white dark:bg-gray-800" data-testid="card-partner-management">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">Partner Management</CardTitle>
                  <CardDescription>
                    Verify partners and manage payouts
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Pending Verification</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {pendingPartners.length} partners waiting
                      </p>
                    </div>
                  </div>
                  {pendingPartners.length > 0 && (
                    <Badge variant="destructive">{pendingPartners.length}</Badge>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Unpaid Orders</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {unpaidOrders.length} payouts to process
                      </p>
                    </div>
                  </div>
                  {unpaidOrders.length > 0 && (
                    <Badge variant="secondary">{unpaidOrders.length}</Badge>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Active Partners</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {activePartners} verified and active
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Link href="/admin/partners">
                <Button className="w-full gap-2" data-testid="button-manage-partners">
                  Manage Partners
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Error Monitoring */}
          <Card className="bg-white dark:bg-gray-800" data-testid="card-error-monitoring">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">Error Monitoring</CardTitle>
                  <CardDescription>
                    Track and resolve system errors with AI
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {recentErrors.length > 0 ? (
                  recentErrors.map((error: any) => (
                    <div
                      key={error.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {error.message}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {error.level} • {error.environment}
                        </p>
                      </div>
                      <Badge
                        variant={
                          error.level === 'error' ? 'destructive' :
                          error.level === 'warning' ? 'secondary' :
                          'default'
                        }
                      >
                        {error.level}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>No errors detected</p>
                  </div>
                )}
              </div>

              <Link href="/admin/errors">
                <Button className="w-full gap-2" variant="outline" data-testid="button-view-errors">
                  View All Errors
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-white dark:bg-gray-800" data-testid="card-quick-actions">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/admin/partners">
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-verify-partners">
                <Clock className="w-4 h-4" />
                Verify Partners ({pendingPartners.length})
              </Button>
            </Link>
            <Link href="/admin/partners">
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-process-payouts">
                <DollarSign className="w-4 h-4" />
                Process Payouts ({unpaidOrders.length})
              </Button>
            </Link>
            <Link href="/admin/errors">
              <Button variant="outline" className="w-full justify-start gap-2" data-testid="button-review-errors">
                <AlertTriangle className="w-4 h-4" />
                Review Errors ({errors.length})
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
