import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AchievementNotification from "./achievement-notification";

interface PropertyMetricsProps {
  propertyId: string;
  views: number;
  likes: number;
  saves: number;
}

export default function PropertyMetrics({ propertyId, views, likes, saves }: PropertyMetricsProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [newAchievement, setNewAchievement] = useState<any>(null);
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/properties/${propertyId}/like`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      setIsLiked(!isLiked);
      
      // Show achievement notification if any unlocked
      if (data.unlockedAchievements && data.unlockedAchievements.length > 0) {
        // Show the first unlocked achievement
        setNewAchievement(data.unlockedAchievements[0]);
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/properties/${propertyId}/save`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      setIsSaved(!isSaved);
      
      // Show achievement notification if any unlocked
      if (data.unlockedAchievements && data.unlockedAchievements.length > 0) {
        // Show the first unlocked achievement
        setNewAchievement(data.unlockedAchievements[0]);
      }
    },
  });

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    likeMutation.mutate();
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    saveMutation.mutate();
  };

  return (
    <div className="space-y-2">
      {/* Views - Non-interactive */}
      <div className="px-2 py-1 rounded-full text-white text-xs flex items-center space-x-1 backdrop-blur-md bg-black/50 border border-white/10">
        <i className="fas fa-eye text-blue-400"></i>
        <span data-testid="text-metric-views">{views}</span>
      </div>
      
      {/* Likes - Interactive */}
      <div 
        className={`px-2 py-1 rounded-full text-white text-xs flex items-center space-x-1 backdrop-blur-md border border-white/10 cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 ${
          isLiked ? 'bg-red-500/80' : 'bg-black/50 hover:bg-red-500/30'
        }`}
        onClick={handleLike}
        data-testid="button-like-property"
      >
        <i className={`fas fa-heart ${isLiked ? 'text-white' : 'text-red-400'}`}></i>
        <span data-testid="text-metric-likes">{likes}</span>
      </div>
      
      {/* Saves - Interactive */}
      <div 
        className={`px-2 py-1 rounded-full text-white text-xs flex items-center space-x-1 backdrop-blur-md border border-white/10 cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 ${
          isSaved ? 'bg-yellow-500/80' : 'bg-black/50 hover:bg-yellow-500/30'
        }`}
        onClick={handleSave}
        data-testid="button-save-property"
      >
        <i className={`fas fa-bookmark ${isSaved ? 'text-white' : 'text-yellow-400'}`}></i>
        <span data-testid="text-metric-saves">{saves}</span>
      </div>
      
      {/* Achievement Notification */}
      <AchievementNotification 
        achievement={newAchievement}
        onClose={() => setNewAchievement(null)}
      />
    </div>
  );
}
