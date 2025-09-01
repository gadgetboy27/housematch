import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ProfilePictureSelectorProps {
  currentProfilePicture: string;
  userId: string;
}

const EMOJI_OPTIONS = [
  "👤", "😀", "😎", "🤓", "😊", "🥰", "😍", "🤩", "😇", "🙂",
  "🤔", "🧐", "😌", "😄", "😃", "🥳", "😁", "😆", "🤗", "🙃",
  "👨", "👩", "👨‍💼", "👩‍💼", "👨‍🎓", "👩‍🎓", "👨‍💻", "👩‍💻", "🧑‍🎨", "👨‍🏫",
  "🦸‍♂️", "🦸‍♀️", "🤵", "👰", "🧙‍♂️", "🧙‍♀️", "🥷", "👑", "🎩", "🎭"
];

const STANDARD_PICTURES = [
  { id: "avatar1", name: "Professional Blue", emoji: "🔵" },
  { id: "avatar2", name: "Professional Green", emoji: "🟢" },
  { id: "avatar3", name: "Professional Purple", emoji: "🟣" },
  { id: "avatar4", name: "Professional Orange", emoji: "🟠" },
  { id: "avatar5", name: "Professional Red", emoji: "🔴" },
  { id: "avatar6", name: "Gradient Sky", emoji: "🌅" },
  { id: "avatar7", name: "Gradient Ocean", emoji: "🌊" },
  { id: "avatar8", name: "Gradient Forest", emoji: "🌲" },
];

export function ProfilePictureSelector({ currentProfilePicture, userId }: ProfilePictureSelectorProps) {
  const [selectedPicture, setSelectedPicture] = useState(currentProfilePicture);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'emoji' | 'standard'>('emoji');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset selected picture when current profile picture changes
  useEffect(() => {
    setSelectedPicture(currentProfilePicture);
  }, [currentProfilePicture]);

  const updateProfilePictureMutation = useMutation({
    mutationFn: async (profilePicture: string) => {
      const response = await apiRequest("PUT", `/api/users/${userId}/profile-picture`, {
        profilePicture
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile Updated",
        description: "Your profile picture has been updated!",
      });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile picture",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    if (selectedPicture !== currentProfilePicture) {
      updateProfilePictureMutation.mutate(selectedPicture);
    } else {
      setIsOpen(false);
    }
  };

  const renderProfilePicture = (picture: string) => {
    // Check if it's an emoji (contains Unicode emoji characters)
    const isEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(picture);
    
    if (isEmoji) {
      return <span className="text-4xl">{picture}</span>;
    }

    // Standard avatar - show colored circle with emoji representation
    const standardAvatar = STANDARD_PICTURES.find(p => p.id === picture);
    if (standardAvatar) {
      return (
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <span className="text-2xl text-white">{standardAvatar.emoji}</span>
        </div>
      );
    }

    // Default fallback
    return <span className="text-4xl">👤</span>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="p-2" data-testid="button-edit-profile-picture">
          <i className="fas fa-edit text-xs"></i>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Profile Picture</DialogTitle>
        </DialogHeader>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-4">
          <button
            onClick={() => setActiveTab('emoji')}
            className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
              activeTab === 'emoji' 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            data-testid="tab-emoji"
          >
            😊 Emojis
          </button>
          <button
            onClick={() => setActiveTab('standard')}
            className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
              activeTab === 'standard' 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
            data-testid="tab-standard"
          >
            🎨 Standard
          </button>
        </div>

        {/* Current Selection Preview */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-center">Preview</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center pb-4">
            {renderProfilePicture(selectedPicture)}
          </CardContent>
        </Card>

        {/* Emoji Tab */}
        {activeTab === 'emoji' && (
          <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto p-2 border rounded-lg">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setSelectedPicture(emoji)}
                className={`w-10 h-10 text-2xl hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ${
                  selectedPicture === emoji ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500' : ''
                }`}
                data-testid={`emoji-${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Standard Pictures Tab */}
        {activeTab === 'standard' && (
          <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto p-2 border rounded-lg">
            {STANDARD_PICTURES.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => setSelectedPicture(avatar.id)}
                className={`p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-center ${
                  selectedPicture === avatar.id ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500' : ''
                }`}
                data-testid={`standard-${avatar.id}`}
              >
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-xl text-white">{avatar.emoji}</span>
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400">{avatar.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 mt-4">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            className="flex-1"
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateProfilePictureMutation.isPending}
            className="flex-1"
            data-testid="button-save"
          >
            {updateProfilePictureMutation.isPending ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}