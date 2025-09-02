import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

interface Achievement {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  badgeColor: string;
  category: string;
  target: number;
  isHidden: boolean;
  points: number;
  rarity: string;
  progress: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
}

interface AchievementStats {
  totalPoints: number;
  unlockedCount: number;
  totalCount: number;
  completionPercentage: number;
}

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const rarityColors = {
  common: "bg-gray-500",
  rare: "bg-blue-500", 
  epic: "bg-purple-500",
  legendary: "bg-yellow-500"
};

const badgeColors = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  gold: "bg-yellow-500",
  red: "bg-red-500",
  yellow: "bg-yellow-400"
};

const categoryEmojis = {
  exploration: "🗺️",
  interaction: "❤️",
  offers: "🤝",
  milestones: "🎯"
};

export default function AchievementsModal({ isOpen, onClose }: AchievementsModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const { data, isLoading } = useQuery<{
    achievements: Achievement[];
    stats: AchievementStats;
  }>({
    queryKey: ["/api/achievements"],
    enabled: isOpen,
  });

  const achievements = data?.achievements || [];
  const stats = data?.stats || { totalPoints: 0, unlockedCount: 0, totalCount: 0, completionPercentage: 0 };

  const categories = ["all", "exploration", "interaction", "offers", "milestones"];
  
  const filteredAchievements = selectedCategory === "all" 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  const unlockedAchievements = achievements.filter(a => a.isUnlocked);
  const inProgressAchievements = achievements.filter(a => !a.isUnlocked && a.progress > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            🏆 Achievements
            <Badge variant="secondary" className="ml-2">
              {stats.unlockedCount}/{stats.totalCount}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg">
                <div className="text-2xl font-bold">{stats.totalPoints}</div>
                <div className="text-sm opacity-90">Total Points</div>
              </div>
              <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-4 rounded-lg">
                <div className="text-2xl font-bold">{stats.unlockedCount}</div>
                <div className="text-sm opacity-90">Unlocked</div>
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg">
                <div className="text-2xl font-bold">{stats.completionPercentage}%</div>
                <div className="text-sm opacity-90">Complete</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{stats.unlockedCount}/{stats.totalCount}</span>
              </div>
              <Progress value={stats.completionPercentage} className="h-3" />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="capitalize"
                  data-testid={`button-filter-${category}`}
                >
                  {category !== "all" && categoryEmojis[category as keyof typeof categoryEmojis]}
                  {category}
                </Button>
              ))}
            </div>

            {/* Quick Stats for Current Category */}
            {selectedCategory !== "all" && (
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-sm text-muted-foreground">
                  {categoryEmojis[selectedCategory as keyof typeof categoryEmojis]} {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}: {" "}
                  {filteredAchievements.filter(a => a.isUnlocked).length}/{filteredAchievements.length} unlocked
                </div>
              </div>
            )}

            {/* Achievements Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAchievements.map((achievement) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border rounded-lg p-4 transition-all duration-200 ${
                    achievement.isUnlocked 
                      ? 'bg-gradient-to-r from-green-50 to-blue-50 border-green-200 shadow-md' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  data-testid={`achievement-${achievement.name}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`p-3 rounded-full ${
                      achievement.isUnlocked 
                        ? badgeColors[achievement.badgeColor as keyof typeof badgeColors] + ' text-white'
                        : 'bg-gray-300 text-gray-500'
                    } transition-all duration-200`}>
                      <i className={`${achievement.icon} text-lg`}></i>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${
                          achievement.isUnlocked ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {achievement.title}
                        </h3>
                        <Badge 
                          variant="secondary" 
                          className={`${rarityColors[achievement.rarity as keyof typeof rarityColors]} text-white text-xs`}
                        >
                          {achievement.rarity}
                        </Badge>
                      </div>

                      <p className={`text-sm ${
                        achievement.isUnlocked ? 'text-gray-700' : 'text-gray-500'
                      }`}>
                        {achievement.description}
                      </p>

                      {/* Progress Bar for Incomplete Achievements */}
                      {!achievement.isUnlocked && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Progress</span>
                            <span>{achievement.progress}/{achievement.target}</span>
                          </div>
                          <Progress 
                            value={(achievement.progress / achievement.target) * 100} 
                            className="h-2"
                          />
                        </div>
                      )}

                      {/* Completion Info */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            +{achievement.points} points
                          </span>
                          {achievement.isUnlocked && (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
                              ✓ Unlocked
                            </Badge>
                          )}
                        </div>
                        {achievement.unlockedAt && (
                          <span className="text-xs text-gray-400">
                            {new Date(achievement.unlockedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredAchievements.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-trophy text-4xl mb-4 opacity-50"></i>
                <p>No achievements in this category yet.</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}