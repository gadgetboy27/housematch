import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CreditCard, ShieldCheck, Lock } from "lucide-react";
import { motion } from "framer-motion";

interface PaymentConfirmationAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemPrice: number;
  itemDescription?: string;
  isProcessing?: boolean;
}

export function PaymentConfirmationAlert({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemPrice,
  itemDescription,
  isProcessing = false,
}: PaymentConfirmationAlertProps) {
  const formatPrice = (cents: number) => {
    const dollars = cents / 100;
    return `$${dollars.toFixed(2)}`;
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md" data-testid="alert-payment-confirmation">
        <AlertDialogHeader>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mx-auto mb-4 p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-16 h-16 flex items-center justify-center"
          >
            <CreditCard className="w-8 h-8 text-white" />
          </motion.div>
          
          <AlertDialogTitle className="text-2xl text-center">
            Confirm Your Purchase
          </AlertDialogTitle>
          
          <AlertDialogDescription asChild>
            <div className="text-center space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 my-4">
                <p className="text-lg font-semibold text-gray-900 mb-1">
                  {itemName}
                </p>
                {itemDescription && (
                  <p className="text-sm text-gray-600 mb-2">
                    {itemDescription}
                  </p>
                )}
                <p className="text-3xl font-bold text-purple-600">
                  {formatPrice(itemPrice)}
                </p>
              </div>

              <div className="space-y-2 text-left">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span>Secure payment processed by Stripe</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Lock className="w-4 h-4 text-green-500" />
                  <span>Your payment information is encrypted</span>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel 
            disabled={isProcessing}
            className="w-full sm:w-auto"
            data-testid="button-cancel-payment"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isProcessing}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            data-testid="button-proceed-payment"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Proceed to Payment
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
