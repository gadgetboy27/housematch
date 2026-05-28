import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Share2, Mail, User, CheckCircle2, AlertCircle } from "lucide-react";

interface ShareReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  reportType: string;
  propertyAddress: string;
  onSuccess?: () => void;
}

export function ShareReportDialog({
  open,
  onOpenChange,
  orderId,
  reportType,
  propertyAddress,
  onSuccess,
}: ShareReportDialogProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const { toast } = useToast();

  const shareMutation = useMutation({
    mutationFn: async (data: { email: string; name?: string }) => {
      const response = await apiRequest("POST", `/api/purchase-orders/${orderId}/share`, data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Report Shared!",
        description: data.emailSent 
          ? `Successfully shared report with ${email}. They'll receive an email notification.`
          : `Report shared with ${email}. Email notification could not be sent.`,
      });
      
      // Reset form
      setEmail("");
      setName("");
      onOpenChange(false);
      
      // Invalidate orders query to refresh the UI (matches all purchase-orders queries)
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.includes('/api/purchase-orders');
        }
      });
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Sharing Failed",
        description: error.message || "Unable to share report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (!email.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    await shareMutation.mutateAsync({ email: email.trim(), name: name.trim() || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-blue-600" />
            Share Property Report
          </DialogTitle>
          <DialogDescription>
            Send this report to a solicitor, partner, or colleague. They'll receive a secure email with access to the report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Report Details */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">{reportType.replace(/_/g, ' ')}</p>
                <p className="text-xs text-muted-foreground">{propertyAddress}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleShare} className="space-y-4">
            {/* Recipient Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Recipient Email *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="solicitor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-share-email"
                className="w-full"
              />
            </div>

            {/* Recipient Name (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Recipient Name (optional)
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-share-name"
                className="w-full"
              />
            </div>

            {/* Security Notice */}
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-800">
                  <p className="font-medium mb-1">Security Notice</p>
                  <p>The recipient will see that you shared this report with them. This action will be tracked for security and audit purposes.</p>
                </div>
              </div>
            </div>
          </form>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={shareMutation.isPending}
            data-testid="button-cancel-share"
          >
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={shareMutation.isPending || !email.trim()}
            data-testid="button-confirm-share"
            className="gap-2"
          >
            {shareMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sharing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Share Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
