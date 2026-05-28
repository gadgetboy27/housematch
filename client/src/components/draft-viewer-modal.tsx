import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { sanitizeLegalDocument } from "@/lib/sanitize";
import { handleQueryError } from "@/lib/errorHandler";

// Note: Using a simple Badge component since we don't have it in UI kit
const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${className}`}>
    {children}
  </span>
);

interface DraftDocument {
  id: string;
  documentType: string;
  documentContent: string;
  status: string;
  version: number;
  createdAt: string;
}

interface DraftViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftId: string;
}

export default function DraftViewerModal({ isOpen, onClose, draftId }: DraftViewerModalProps) {
  const [draft, setDraft] = useState<DraftDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDraftDocument = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/draft-documents/${draftId}`);
      if (response.ok) {
        const result = await response.json();
        setDraft(result.draftDocument);
      } else {
        throw new Error("Failed to load document");
      }
    } catch (error) {
      handleQueryError(error as Error, "Failed to Load Document");
    } finally {
      setIsLoading(false);
    }
  }, [draftId]);

  useEffect(() => {
    if (isOpen && draftId) {
      fetchDraftDocument();
    }
  }, [isOpen, draftId, fetchDraftDocument]);

  const downloadAsPDF = () => {
    // Feature not yet implemented - download as PDF
    alert("PDF download feature coming soon. Please use the document preview for now.");
  };

  const downloadAsWord = () => {
    // Feature not yet implemented - download as Word document
    alert("Word document download coming soon. Please use the document preview for now.");
  };

  const requestLawyerReview = () => {
    // Feature not yet implemented - request lawyer review
    alert("Lawyer review request feature coming soon. Please consult with your lawyer directly for now.");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generated': return 'bg-blue-100 text-blue-800';
      case 'reviewed': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-emerald-100 text-emerald-800';
      case 'signed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <i className="fas fa-file-contract text-blue-600"></i>
            Draft Legal Document
          </DialogTitle>
          <DialogDescription>
            Review your generated Purchase & Sale Agreement. Download or request lawyer review.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading draft document...</span>
          </div>
        ) : draft ? (
          <div className="space-y-6">
            {/* Document Info */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-semibold">Document Status</h3>
                <p className="text-sm text-gray-600">Version {draft.version} • {new Date(draft.createdAt).toLocaleDateString()}</p>
              </div>
              <Badge className={getStatusColor(draft.status)}>
                {draft.status.toUpperCase()}
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={downloadAsPDF} className="flex items-center gap-2">
                <i className="fas fa-file-pdf"></i>
                Download PDF
              </Button>
              <Button variant="outline" onClick={downloadAsWord} className="flex items-center gap-2">
                <i className="fas fa-file-word"></i>
                Download Word
              </Button>
              <Button variant="outline" onClick={requestLawyerReview} className="flex items-center gap-2">
                <i className="fas fa-balance-scale"></i>
                Request Lawyer Review
              </Button>
            </div>

            <Separator />

            {/* Document Content */}
            <div className="space-y-4">
              <h3 className="font-semibold">Document Preview</h3>
              <div 
                className="bg-white border rounded-lg p-6 font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: sanitizeLegalDocument(draft.documentContent) }}
              />
            </div>

            {/* Legal Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <i className="fas fa-exclamation-triangle text-yellow-600 mt-1"></i>
                <div>
                  <h4 className="font-semibold text-yellow-800">⚠️ Important Legal Notice</h4>
                  <p className="text-yellow-700 text-sm mt-1">
                    This is a draft document for review only. We strongly recommend having a qualified lawyer review all terms before signing. 
                    This document is not legally binding until properly executed by all parties with legal counsel.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Failed to load draft document.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}