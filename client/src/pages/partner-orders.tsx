import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, Clock, Package, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function PartnerOrders() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    message: '',
  });

  // Fetch partner auth status to check verification
  const { data: authStatus } = useQuery<any>({
    queryKey: ["/partner/auth/status"],
  });

  const partner = authStatus?.user;
  const isVerified = partner?.verificationStatus === 'verified';

  // Fetch all orders
  const { data: allOrders = [], isLoading } = useQuery<any[]>({
    queryKey: ["/partner/orders"],
  });

  // Filter orders by status
  const pendingOrders = allOrders.filter((o: any) => o.status === 'assigned' || o.status === 'pending');
  const activeOrders = allOrders.filter((o: any) => o.status === 'accepted' || o.status === 'in_progress');
  const completedOrders = allOrders.filter((o: any) => o.status === 'completed');

  // Accept order mutation
  const acceptOrderMutation = useMutation({
    mutationFn: (orderId: string) => apiRequest("POST", `/partner/orders/${orderId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/partner/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/partner/analytics"] });
      toast({
        title: "Order accepted",
        description: "You can now start working on this order",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error accepting order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update order status mutation
  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: any }) =>
      apiRequest("POST", `/partner/orders/${orderId}/update`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/partner/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/partner/analytics"] });
      setSelectedOrder(null);
      setStatusUpdate({ status: '', message: '' });
      toast({
        title: "Order updated",
        description: "Status update sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAcceptOrder = (orderId: string) => {
    acceptOrderMutation.mutate(orderId);
  };

  const handleUpdateStatus = (orderId: string, newStatus: string) => {
    updateOrderMutation.mutate({
      orderId,
      data: {
        status: newStatus,
        message: statusUpdate.message,
      },
    });
  };

  const renderOrder = (order: any) => (
    <Card key={order.id} className="mb-4" data-testid={`order-card-${order.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{order.serviceName}</CardTitle>
            <CardDescription>Order #{order.id.substring(0, 8)}</CardDescription>
          </div>
          <Badge variant={
            order.status === 'completed' ? 'default' :
            order.status === 'in_progress' ? 'secondary' :
            order.status === 'cancelled' ? 'destructive' :
            'outline'
          } data-testid={`badge-order-status-${order.id}`}>
            {order.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700 dark:text-gray-300">Customer</p>
            <p className="text-gray-600 dark:text-gray-400" data-testid={`text-customer-${order.id}`}>{order.customerName}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700 dark:text-gray-300">Contact</p>
            <p className="text-gray-600 dark:text-gray-400">{order.customerEmail}</p>
            {order.customerPhone && <p className="text-gray-600 dark:text-gray-400">{order.customerPhone}</p>}
          </div>
          <div>
            <p className="font-medium text-gray-700 dark:text-gray-300">Property</p>
            <p className="text-gray-600 dark:text-gray-400">{order.propertyAddress || "Not provided"}</p>
          </div>
          <div>
            <p className="font-medium text-gray-700 dark:text-gray-300">Price</p>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400" data-testid={`text-price-${order.id}`}>
              ${(order.priceCents / 100).toFixed(2)}
            </p>
          </div>
        </div>

        {order.notes && (
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <p className="font-medium text-sm text-gray-700 dark:text-gray-300">Special Instructions</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{order.notes}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {order.status === 'assigned' && (
            <Button
              onClick={() => handleAcceptOrder(order.id)}
              disabled={!isVerified || acceptOrderMutation.isPending}
              className="flex-1"
              data-testid={`button-accept-${order.id}`}
              title={!isVerified ? "Account must be verified before accepting orders" : ""}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {isVerified ? "Accept Order" : "Verification Required"}
            </Button>
          )}

          {(order.status === 'accepted' || order.status === 'in_progress') && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1" data-testid={`button-update-status-${order.id}`}>
                  Update Status
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Order Status</DialogTitle>
                  <DialogDescription>
                    Send a status update to the customer
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>New Status</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={statusUpdate.status === 'in_progress' ? 'default' : 'outline'}
                        onClick={() => setStatusUpdate({ ...statusUpdate, status: 'in_progress' })}
                        data-testid="button-status-in-progress"
                      >
                        In Progress
                      </Button>
                      <Button
                        variant={statusUpdate.status === 'completed' ? 'default' : 'outline'}
                        onClick={() => setStatusUpdate({ ...statusUpdate, status: 'completed' })}
                        data-testid="button-status-completed"
                      >
                        Completed
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Message (Optional)</Label>
                    <Textarea
                      value={statusUpdate.message}
                      onChange={(e) => setStatusUpdate({ ...statusUpdate, message: e.target.value })}
                      placeholder="Add notes about your progress..."
                      rows={4}
                      data-testid="textarea-status-message"
                    />
                  </div>

                  <Button
                    onClick={() => handleUpdateStatus(order.id, statusUpdate.status)}
                    disabled={!statusUpdate.status || updateOrderMutation.isPending}
                    className="w-full"
                    data-testid="button-submit-update"
                  >
                    Send Update
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-orders-title">
            Service Orders
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your active and completed orders
          </p>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="flex items-center gap-2" data-testid="tab-pending">
              <Clock className="w-4 h-4" />
              Pending ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2" data-testid="tab-active">
              <Package className="w-4 h-4" />
              Active ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2" data-testid="tab-completed">
              <CheckCircle2 className="w-4 h-4" />
              Completed ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {pendingOrders.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-gray-500" data-testid="text-no-pending">No pending orders</p>
                </CardContent>
              </Card>
            ) : (
              pendingOrders.map(renderOrder)
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-6">
            {activeOrders.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-gray-500" data-testid="text-no-active">No active orders</p>
                </CardContent>
              </Card>
            ) : (
              activeOrders.map(renderOrder)
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {completedOrders.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-gray-500" data-testid="text-no-completed">No completed orders</p>
                </CardContent>
              </Card>
            ) : (
              completedOrders.map(renderOrder)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
