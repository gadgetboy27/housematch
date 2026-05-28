import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, DollarSign, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function AdminPartners() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [verifyNotes, setVerifyNotes] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");
  const [payoutData, setPayoutData] = useState({ amount: "", notes: "" });

  // Fetch pending partners
  const { data: pendingPartners = [], isLoading: pendingLoading } = useQuery<any[]>({
    queryKey: ["/api/partners/pending"],
  });

  // Fetch all partners
  const { data: allPartners = [], isLoading: partnersLoading } = useQuery<any[]>({
    queryKey: ["/api/partners"],
  });

  // Fetch unpaid orders
  const { data: unpaidOrders = [], isLoading: unpaidLoading } = useQuery<any[]>({
    queryKey: ["/api/payouts/unpaid"],
  });

  // Verify partner mutation
  const verifyMutation = useMutation({
    mutationFn: ({ partnerId, notes }: { partnerId: string; notes: string }) =>
      apiRequest("POST", `/api/partners/${partnerId}/verify`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      setVerifyNotes("");
      toast({
        title: "Partner verified",
        description: "Partner is now active and can accept orders",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error verifying partner",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject partner mutation
  const rejectMutation = useMutation({
    mutationFn: ({ partnerId, notes }: { partnerId: string; notes: string }) =>
      apiRequest("POST", `/api/partners/${partnerId}/reject`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partners/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
      setRejectNotes("");
      toast({
        title: "Partner rejected",
        description: "Rejection notification will be sent",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error rejecting partner",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update payout mutation
  const payoutMutation = useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: any }) =>
      apiRequest("POST", `/api/payouts/${orderId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payouts/unpaid"] });
      setPayoutData({ amount: "", notes: "" });
      toast({
        title: "Payout recorded",
        description: "Bank transfer marked as completed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error recording payout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/admin/dashboard')}
            className="gap-2"
            data-testid="button-back-to-dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-admin-partners-title">
            Partner Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Verify partners and manage payouts
          </p>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="flex items-center gap-2" data-testid="tab-pending-partners">
              <Clock className="w-4 h-4" />
              Pending Verification ({pendingPartners.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2" data-testid="tab-all-partners">
              All Partners ({allPartners.length})
            </TabsTrigger>
            <TabsTrigger value="payouts" className="flex items-center gap-2" data-testid="tab-unpaid-orders">
              <DollarSign className="w-4 h-4" />
              Unpaid Orders ({unpaidOrders.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Partners Tab */}
          <TabsContent value="pending" className="mt-6">
            {pendingLoading ? (
              <p className="text-center text-gray-500">Loading...</p>
            ) : pendingPartners.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-gray-500" data-testid="text-no-pending-partners">
                    No partners awaiting verification
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingPartners.map((partner: any) => (
                  <Card key={partner.id} data-testid={`partner-card-${partner.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{partner.companyName}</CardTitle>
                          <CardDescription>{partner.email}</CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300">Contact</p>
                          <p className="text-gray-600 dark:text-gray-400">{partner.contactName}</p>
                          <p className="text-gray-600 dark:text-gray-400">{partner.phone}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300">Services</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {partner.serviceTypes?.map((service: string) => (
                              <Badge key={service} variant="secondary" className="text-xs">
                                {service.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button className="flex-1" data-testid={`button-verify-${partner.id}`}>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Approve Partner</DialogTitle>
                              <DialogDescription>
                                This will activate the partner and allow them to accept orders
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Verification Notes (Optional)</Label>
                                <Textarea
                                  value={verifyNotes}
                                  onChange={(e) => setVerifyNotes(e.target.value)}
                                  placeholder="Add any internal notes about this verification..."
                                  rows={3}
                                  data-testid="textarea-verify-notes"
                                />
                              </div>
                              <Button
                                onClick={() => verifyMutation.mutate({ partnerId: partner.id, notes: verifyNotes })}
                                disabled={verifyMutation.isPending}
                                className="w-full"
                                data-testid="button-confirm-verify"
                              >
                                Confirm Approval
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="destructive" className="flex-1" data-testid={`button-reject-${partner.id}`}>
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject Partner</DialogTitle>
                              <DialogDescription>
                                Please provide a reason for rejecting this partner application
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Rejection Reason (Required)</Label>
                                <Textarea
                                  value={rejectNotes}
                                  onChange={(e) => setRejectNotes(e.target.value)}
                                  placeholder="Explain why this application was rejected..."
                                  rows={4}
                                  data-testid="textarea-reject-notes"
                                  required
                                />
                              </div>
                              <Button
                                onClick={() => rejectMutation.mutate({ partnerId: partner.id, notes: rejectNotes })}
                                disabled={!rejectNotes || rejectMutation.isPending}
                                variant="destructive"
                                className="w-full"
                                data-testid="button-confirm-reject"
                              >
                                Confirm Rejection
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* All Partners Tab */}
          <TabsContent value="all" className="mt-6">
            {partnersLoading ? (
              <p className="text-center text-gray-500">Loading...</p>
            ) : (
              <div className="space-y-4">
                {allPartners.map((partner: any) => (
                  <Card key={partner.id} data-testid={`all-partner-${partner.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{partner.companyName}</CardTitle>
                          <CardDescription>{partner.email}</CardDescription>
                        </div>
                        <Badge variant={
                          partner.verificationStatus === 'verified' ? 'default' :
                          partner.verificationStatus === 'rejected' ? 'destructive' :
                          'outline'
                        } data-testid={`badge-status-${partner.id}`}>
                          {partner.verificationStatus}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300">Total Jobs</p>
                          <p className="text-lg font-semibold">{partner.totalJobsCompleted || 0}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300">Rating</p>
                          <p className="text-lg font-semibold">
                            {partner.averageRating ? parseFloat(partner.averageRating).toFixed(1) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300">Earnings</p>
                          <p className="text-lg font-semibold text-green-600">
                            ${((partner.totalEarnings || 0) / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Unpaid Orders Tab */}
          <TabsContent value="payouts" className="mt-6">
            {unpaidLoading ? (
              <p className="text-center text-gray-500">Loading...</p>
            ) : unpaidOrders.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-gray-500" data-testid="text-no-unpaid-orders">
                    No unpaid orders
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {unpaidOrders.map((order: any) => (
                  <Card key={order.id} data-testid={`unpaid-order-${order.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{order.serviceName}</CardTitle>
                          <CardDescription>
                            Completed: {new Date(order.completedAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge variant="destructive">Unpaid</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300">Partner</p>
                          <p className="text-gray-600 dark:text-gray-400">Partner ID: {order.partnerId}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300">Amount</p>
                          <p className="text-2xl font-bold text-green-600">
                            ${((order.providerEarningsCents || order.priceCents) / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full" data-testid={`button-mark-paid-${order.id}`}>
                            <DollarSign className="w-4 h-4 mr-2" />
                            Mark as Paid
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Record Bank Transfer</DialogTitle>
                            <DialogDescription>
                              Mark this order as paid after processing bank transfer
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Payout Amount (NZD)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={payoutData.amount}
                                onChange={(e) => setPayoutData({ ...payoutData, amount: e.target.value })}
                                placeholder={(((order.providerEarningsCents || order.priceCents) / 100)).toFixed(2)}
                                data-testid="input-payout-amount"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Payment Notes (Optional)</Label>
                              <Textarea
                                value={payoutData.notes}
                                onChange={(e) => setPayoutData({ ...payoutData, notes: e.target.value })}
                                placeholder="Bank transfer reference, date processed, etc..."
                                rows={3}
                                data-testid="textarea-payout-notes"
                              />
                            </div>
                            <Button
                              onClick={() => payoutMutation.mutate({
                                orderId: order.id,
                                data: {
                                  status: 'paid',
                                  amount: payoutData.amount ? Math.round(parseFloat(payoutData.amount) * 100) : order.providerEarningsCents || order.priceCents,
                                  notes: payoutData.notes,
                                }
                              })}
                              disabled={payoutMutation.isPending}
                              className="w-full"
                              data-testid="button-confirm-payout"
                            >
                              Confirm Payment
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
