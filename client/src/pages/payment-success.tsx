import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle, Home, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [paymentStatus, setPaymentStatus] = useState<{
    loading: boolean;
    success: boolean;
    propertyId?: string;
    orderId?: string;
    message?: string;
  }>({ loading: true, success: false });
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const processPayment = async () => {
      // Get session_id from URL
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');

      if (!sessionId) {
        setPaymentStatus({
          loading: false,
          success: false,
          message: "No payment session found",
        });
        return;
      }

      try {
        // Call backend to process payment
        const response = await apiRequest("GET", `/api/stripe/payment-success?session_id=${sessionId}`);
        const data = await response.json();

        if (data.success) {
          setPaymentStatus({
            loading: false,
            success: true,
            propertyId: data.propertyId,
            orderId: data.orderId,
            message: data.message,
          });

          // Confetti effect
          if (typeof window !== 'undefined' && (window as any).confetti) {
            (window as any).confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
          }
        } else {
          setPaymentStatus({
            loading: false,
            success: false,
            message: data.message || "Payment processing failed",
          });
        }
      } catch (error: any) {
        console.error("Payment verification error:", error);
        setPaymentStatus({
          loading: false,
          success: false,
          message: error.message || "Failed to verify payment",
        });
      }
    };

    processPayment();
  }, []);

  // Auto-redirect after successful payment
  useEffect(() => {
    if (paymentStatus.success && !paymentStatus.loading) {
      // Show success message for 3 seconds
      const successTimer = setTimeout(() => {
        setIsRedirecting(true);
        
        // Then redirect after 2 more seconds
        const redirectTimer = setTimeout(() => {
          if (paymentStatus.propertyId) {
            setLocation(`/property/${paymentStatus.propertyId}`);
          } else if (paymentStatus.orderId) {
            // If it's a report order, redirect to profile to see the order
            setLocation("/profile");
          } else {
            setLocation("/");
          }
        }, 2000);

        return () => clearTimeout(redirectTimer);
      }, 3000);

      return () => clearTimeout(successTimer);
    }
  }, [paymentStatus.success, paymentStatus.loading, paymentStatus.propertyId, paymentStatus.orderId, setLocation]);

  if (paymentStatus.loading) {
    return (
      <div className="fixed inset-0 z-50 min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="animate-spin w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Payment...</h2>
          <p className="text-gray-600">Please wait while we verify your payment.</p>
        </Card>
      </div>
    );
  }

  if (!paymentStatus.success) {
    return (
      <div className="fixed inset-0 z-50 min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
          <p className="text-gray-600 mb-6">{paymentStatus.message}</p>
          <Button 
            onClick={() => setLocation("/add-property")}
            className="bg-red-600 hover:bg-red-700"
            data-testid="button-try-again"
          >
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  // Redirecting state
  if (isRedirecting) {
    return (
      <div className="fixed inset-0 z-50 min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-8 max-w-md w-full text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"
            />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Taking you to your {paymentStatus.propertyId ? 'property' : paymentStatus.orderId ? 'profile' : 'dashboard'}...
            </h2>
            <p className="text-gray-600">
              {paymentStatus.orderId ? 'View your order status and delivery timeline' : "Just a moment, we're sending you back now"}
            </p>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="p-8 max-w-md w-full text-center">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-12 h-12 text-green-600" />
          </motion.div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            🎉 Payment Successful!
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            {paymentStatus.message || "Your property is now live and ready to be discovered!"}
          </p>

          {/* What's Next Section */}
          <div className="bg-purple-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-purple-900 mb-2">What happens next?</h3>
            {paymentStatus.propertyId ? (
              <ul className="space-y-2 text-sm text-purple-800">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Your property is now visible to thousands of buyers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Buyers can swipe, like, and save your listing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>You'll receive notifications when buyers show interest</span>
                </li>
              </ul>
            ) : (
              <ul className="space-y-2 text-sm text-purple-800">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Your order has been received and is being processed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>We'll email you when your report is ready</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Most reports are delivered within 1-2 business days</span>
                </li>
              </ul>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {paymentStatus.propertyId ? (
              <>
                <Button
                  onClick={() => setLocation(`/property/${paymentStatus.propertyId}`)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  data-testid="button-view-property"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Your Listing
                </Button>
                <Button
                  onClick={() => setLocation("/")}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-go-home"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Home
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setLocation("/profile")}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  data-testid="button-view-reports"
                >
                  View My Reports
                </Button>
                <Button
                  onClick={() => setLocation("/")}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-go-home"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Home
                </Button>
              </>
            )}
          </div>

          {/* Additional Info */}
          <p className="text-xs text-gray-500 mt-6">
            A confirmation email has been sent to your registered email address.
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
