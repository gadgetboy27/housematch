import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Property } from "@shared/schema";
import { 
  MessageSquare, 
  Link2,
  Check,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { 
  SiWhatsapp,
  SiFacebook,
  SiMessenger,
  SiX
} from "react-icons/si";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
}

export default function ShareModal({ isOpen, onClose, property: initialProperty }: ShareModalProps) {
  const { toast } = useToast();
  const [selectedProperty, setSelectedProperty] = useState<Property>(initialProperty);
  const [showPropertySelector, setShowPropertySelector] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Fetch user's liked properties
  const { data: user } = useQuery<{ id: string }>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: likedProperties = [] } = useQuery<Property[]>({
    queryKey: [`/api/users/${user?.id}/liked-properties`],
    enabled: isOpen && !!user,
  });

  // Share mutation for tracking
  const shareMutation = useMutation({
    mutationFn: async (shareMethod: string) => {
      const response = await apiRequest("POST", "/api/shares", {
        propertyId: selectedProperty.id,
        shareMethod,
      });
      return response.json();
    },
  });

  const getShareUrl = () => {
    return `${window.location.origin}/property/${selectedProperty.id}`;
  };

  const getShareText = () => {
    return `Check out this property: ${selectedProperty.title} - ${selectedProperty.address}, ${selectedProperty.suburb}`;
  };

  const handleCopyLink = async () => {
    const shareUrl = getShareUrl();
    await navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    shareMutation.mutate("link");
    
    toast({
      title: "Link Copied!",
      description: "Property link copied to clipboard",
    });

    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleExternalShare = (platform: string) => {
    const shareUrl = getShareUrl();
    const shareText = getShareText();
    
    let url = "";
    switch (platform) {
      case "sms":
        // Native SMS (works on iOS and Android)
        url = `sms:?&body=${encodeURIComponent(shareText + "\n" + shareUrl)}`;
        break;
      case "whatsapp":
        // WhatsApp (opens app if installed, web otherwise)
        url = `https://wa.me/?text=${encodeURIComponent(shareText + "\n" + shareUrl)}`;
        break;
      case "messenger":
        // Facebook Messenger (app or web)
        url = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&app_id=YOUR_APP_ID&redirect_uri=${encodeURIComponent(shareUrl)}`;
        break;
      case "facebook":
        // Facebook share dialog
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case "x":
        // X (Twitter)
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        break;
    }
    
    if (url) {
      shareMutation.mutate(platform);
      window.open(url, "_blank");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[95vw] sm:max-w-md mx-auto p-0 gap-0 overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 shadow-2xl"
        data-testid="modal-share"
      >
        {/* Header with glassmorphic gradient */}
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 border-b border-white/10">
          <DialogTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Share Property
          </DialogTitle>
        </DialogHeader>

        {/* Current Property Display */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10">
          <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-white/50 to-white/30 dark:from-gray-800/50 dark:to-gray-800/30 backdrop-blur-sm border border-white/20">
            <img
              src={selectedProperty.imageUrl || '/placeholder-property.jpg'}
              alt={selectedProperty.title}
              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg shadow-lg flex-shrink-0"
            />
            <div className="flex-1 min-w-0 overflow-hidden">
              <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 break-words">{selectedProperty.title}</h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1 break-all">
                {selectedProperty.address}, {selectedProperty.suburb}
              </p>
              <p className="text-xs sm:text-sm font-bold text-pink-600 dark:text-pink-400 mt-1">
                {selectedProperty.price}
              </p>
            </div>
          </div>

          {/* Property Selector Toggle */}
          {likedProperties.length > 1 && (
            <Button
              variant="ghost"
              onClick={() => setShowPropertySelector(!showPropertySelector)}
              className="w-full mt-2 sm:mt-3 text-xs sm:text-sm hover:bg-white/50 dark:hover:bg-gray-800/50 h-auto py-2"
              data-testid="button-toggle-property-selector"
            >
              {showPropertySelector ? (
                <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                  <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="break-words">Hide other properties</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                  <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="break-words">Choose from {likedProperties.length - 1} other liked</span>
                </span>
              )}
            </Button>
          )}
        </div>

        {/* Liked Properties Selector */}
        {showPropertySelector && likedProperties.length > 1 && (
          <ScrollArea className="max-h-[200px] border-b border-white/10">
            <div className="px-4 sm:px-6 py-3 space-y-2">
              {likedProperties
                .filter(p => p.id !== selectedProperty.id)
                .map((prop) => (
                  <button
                    key={prop.id}
                    onClick={() => {
                      setSelectedProperty(prop);
                      setShowPropertySelector(false);
                    }}
                    className="flex items-center gap-2 sm:gap-3 w-full p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all group"
                    data-testid={`button-select-property-${prop.id}`}
                  >
                    <img
                      src={prop.imageUrl || '/placeholder-property.jpg'}
                      alt={prop.title}
                      className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg shadow-md group-hover:shadow-lg transition-shadow flex-shrink-0"
                    />
                    <div className="flex-1 text-left min-w-0 overflow-hidden">
                      <div className="font-medium text-xs sm:text-sm line-clamp-1 break-words">{prop.title}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1 break-all">
                        {prop.address}, {prop.suburb}
                      </div>
                      <div className="text-xs font-semibold text-pink-600 dark:text-pink-400 mt-0.5">
                        {prop.price}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </ScrollArea>
        )}

        {/* Share Options */}
        <div className="px-4 sm:px-6 py-4 sm:py-5">
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">Share via</p>
          
          {/* Primary Share Buttons - Top Row */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-2 sm:mb-3">
            <button
              onClick={() => handleExternalShare("sms")}
              className="flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 border border-blue-500/30 transition-all hover:scale-105 active:scale-95"
              data-testid="button-share-sms"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold break-words text-center">SMS</span>
            </button>

            <button
              onClick={() => handleExternalShare("whatsapp")}
              className="flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-4 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 hover:from-green-500/30 hover:to-green-600/30 border border-green-500/30 transition-all hover:scale-105 active:scale-95"
              data-testid="button-share-whatsapp"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <SiWhatsapp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold break-words text-center">WhatsApp</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-4 rounded-xl bg-gradient-to-br from-gray-500/20 to-gray-600/20 hover:from-gray-500/30 hover:to-gray-600/30 border border-gray-500/30 transition-all hover:scale-105 active:scale-95"
              data-testid="button-share-copy-link"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center shadow-lg relative">
                {linkCopied ? (
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                ) : (
                  <Link2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                )}
              </div>
              <span className="text-[10px] sm:text-xs font-semibold break-words text-center">{linkCopied ? "Copied!" : "Copy Link"}</span>
            </button>
          </div>

          {/* Secondary Share Buttons - Bottom Row */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <button
              onClick={() => handleExternalShare("messenger")}
              className="flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-4 rounded-xl bg-gradient-to-br from-blue-600/20 to-blue-700/20 hover:from-blue-600/30 hover:to-blue-700/30 border border-blue-600/30 transition-all hover:scale-105 active:scale-95"
              data-testid="button-share-messenger"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-lg">
                <SiMessenger className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold break-words text-center">Messenger</span>
            </button>

            <button
              onClick={() => handleExternalShare("facebook")}
              className="flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 border border-blue-500/30 transition-all hover:scale-105 active:scale-95"
              data-testid="button-share-facebook"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <SiFacebook className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold break-words text-center">Facebook</span>
            </button>

            <button
              onClick={() => handleExternalShare("x")}
              className="flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-4 rounded-xl bg-gradient-to-br from-gray-800/20 to-black/20 hover:from-gray-800/30 hover:to-black/30 border border-gray-800/30 transition-all hover:scale-105 active:scale-95"
              data-testid="button-share-x"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-gray-800 to-black rounded-full flex items-center justify-center shadow-lg">
                <SiX className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold break-words text-center">X</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
