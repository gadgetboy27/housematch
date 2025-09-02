import { db } from "./db";
import { achievements, userAchievements, type Achievement, type UserAchievement, type InsertUserAchievement } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export class AchievementService {
  // Initialize default achievements in the database
  static async initializeAchievements() {
    const defaultAchievements = [
      // Exploration Achievements
      {
        name: "first_view",
        title: "First Look",
        description: "View your first property",
        icon: "fas fa-eye",
        badgeColor: "blue",
        category: "exploration",
        target: 1,
        points: 10,
        rarity: "common"
      },
      {
        name: "property_explorer",
        title: "Property Explorer",
        description: "View 10 different properties",
        icon: "fas fa-map-marked-alt",
        badgeColor: "green",
        category: "exploration",
        target: 10,
        points: 25,
        rarity: "common"
      },
      {
        name: "house_hunter",
        title: "House Hunter",
        description: "View 50 different properties",
        icon: "fas fa-home",
        badgeColor: "purple",
        category: "exploration",
        target: 50,
        points: 100,
        rarity: "rare"
      },
      {
        name: "property_connoisseur",
        title: "Property Connoisseur",
        description: "View 100 different properties",
        icon: "fas fa-building",
        badgeColor: "gold",
        category: "exploration",
        target: 100,
        points: 250,
        rarity: "epic"
      },

      // Interaction Achievements
      {
        name: "first_like",
        title: "Love at First Sight",
        description: "Like your first property",
        icon: "fas fa-heart",
        badgeColor: "red",
        category: "interaction",
        target: 1,
        points: 10,
        rarity: "common"
      },
      {
        name: "heart_collector",
        title: "Heart Collector",
        description: "Like 25 properties",
        icon: "fas fa-heartbeat",
        badgeColor: "red",
        category: "interaction",
        target: 25,
        points: 50,
        rarity: "rare"
      },
      {
        name: "first_save",
        title: "Bookmark Beginner",
        description: "Save your first property",
        icon: "fas fa-bookmark",
        badgeColor: "yellow",
        category: "interaction",
        target: 1,
        points: 10,
        rarity: "common"
      },
      {
        name: "collection_master",
        title: "Collection Master",
        description: "Save 15 properties",
        icon: "fas fa-star",
        badgeColor: "gold",
        category: "interaction",
        target: 15,
        points: 75,
        rarity: "epic"
      },

      // Offers Achievements
      {
        name: "first_offer",
        title: "Making Moves",
        description: "Submit your first property offer",
        icon: "fas fa-handshake",
        badgeColor: "green",
        category: "offers",
        target: 1,
        points: 50,
        rarity: "rare"
      },
      {
        name: "serious_buyer",
        title: "Serious Buyer",
        description: "Submit 5 property offers",
        icon: "fas fa-briefcase",
        badgeColor: "purple",
        category: "offers",
        target: 5,
        points: 200,
        rarity: "epic"
      },

      // Milestone Achievements
      {
        name: "early_adopter",
        title: "Early Adopter",
        description: "Join during the beta phase",
        icon: "fas fa-rocket",
        badgeColor: "gold",
        category: "milestones",
        target: 1,
        points: 100,
        rarity: "legendary"
      },
      {
        name: "social_butterfly",
        title: "Social Butterfly",
        description: "Complete your profile with all details",
        icon: "fas fa-user-circle",
        badgeColor: "blue",
        category: "milestones",
        target: 1,
        points: 25,
        rarity: "common"
      },
      {
        name: "speed_demon",
        title: "Speed Demon",
        description: "Like 10 properties in under 1 minute",
        icon: "fas fa-tachometer-alt",
        badgeColor: "red",
        category: "interaction",
        target: 1,
        points: 75,
        rarity: "rare",
        isHidden: true
      }
    ];

    // Insert achievements if they don't exist
    for (const achievement of defaultAchievements) {
      try {
        await db.insert(achievements)
          .values(achievement)
          .onConflictDoNothing();
      } catch (error) {
        console.error(`Failed to insert achievement ${achievement.name}:`, error);
      }
    }

    console.log("🏆 Achievement system initialized with", defaultAchievements.length, "achievements");
  }

  // Track user action and check for achievement unlocks
  static async trackAction(userId: string, actionType: string, actionData?: any): Promise<UserAchievement[]> {
    const unlockedAchievements: UserAchievement[] = [];

    try {
      // Get relevant achievements for this action type
      const relevantAchievements = await db.select()
        .from(achievements)
        .where(eq(achievements.category, this.getAchievementCategory(actionType)));

      for (const achievement of relevantAchievements) {
        // Skip if achievement doesn't match this action
        if (!this.doesActionMatchAchievement(actionType, achievement)) {
          continue;
        }

        // Get or create user achievement record
        let userAchievement = await db.select()
          .from(userAchievements)
          .where(and(
            eq(userAchievements.userId, userId),
            eq(userAchievements.achievementId, achievement.id)
          ))
          .limit(1)
          .then(results => results[0]);

        if (!userAchievement) {
          // Create new user achievement record
          const [newUserAchievement] = await db.insert(userAchievements)
            .values({
              userId,
              achievementId: achievement.id,
              progress: 0,
              isUnlocked: false
            })
            .returning();
          userAchievement = newUserAchievement;
        }

        // Skip if already unlocked
        if (userAchievement.isUnlocked) {
          continue;
        }

        // Calculate new progress
        const newProgress = userAchievement.progress + 1;
        const isUnlocked = newProgress >= achievement.target;

        // Update progress
        const [updatedUserAchievement] = await db.update(userAchievements)
          .set({
            progress: newProgress,
            isUnlocked,
            unlockedAt: isUnlocked ? new Date() : null,
            updatedAt: new Date()
          })
          .where(eq(userAchievements.id, userAchievement.id))
          .returning();

        if (isUnlocked) {
          console.log(`🏆 Achievement unlocked for user ${userId}: ${achievement.title}`);
          unlockedAchievements.push(updatedUserAchievement);
        }
      }
    } catch (error) {
      console.error("Error tracking achievement action:", error);
    }

    return unlockedAchievements;
  }

  // Get user's achievements with details
  static async getUserAchievements(userId: string): Promise<Array<UserAchievement & Achievement>> {
    return await db.select({
      // User achievement fields
      id: userAchievements.id,
      userId: userAchievements.userId,
      achievementId: userAchievements.achievementId,
      progress: userAchievements.progress,
      isUnlocked: userAchievements.isUnlocked,
      unlockedAt: userAchievements.unlockedAt,
      createdAt: userAchievements.createdAt,
      updatedAt: userAchievements.updatedAt,
      // Achievement details
      name: achievements.name,
      title: achievements.title,
      description: achievements.description,
      icon: achievements.icon,
      badgeColor: achievements.badgeColor,
      category: achievements.category,
      target: achievements.target,
      isHidden: achievements.isHidden,
      points: achievements.points,
      rarity: achievements.rarity,
    })
    .from(userAchievements)
    .rightJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .where(eq(userAchievements.userId, userId))
    .orderBy(userAchievements.unlockedAt);
  }

  // Get user's achievement statistics
  static async getUserAchievementStats(userId: string): Promise<{
    totalPoints: number;
    unlockedCount: number;
    totalCount: number;
    completionPercentage: number;
  }> {
    const [stats] = await db.select({
      totalPoints: sql<number>`COALESCE(SUM(CASE WHEN ${userAchievements.isUnlocked} THEN ${achievements.points} ELSE 0 END), 0)`,
      unlockedCount: sql<number>`COUNT(CASE WHEN ${userAchievements.isUnlocked} THEN 1 END)`,
      totalCount: sql<number>`COUNT(*)`,
    })
    .from(achievements)
    .leftJoin(userAchievements, and(
      eq(userAchievements.achievementId, achievements.id),
      eq(userAchievements.userId, userId)
    ));

    const completionPercentage = stats.totalCount > 0 
      ? Math.round((stats.unlockedCount / stats.totalCount) * 100) 
      : 0;

    return {
      ...stats,
      completionPercentage
    };
  }

  // Helper methods
  private static getAchievementCategory(actionType: string): string {
    const categoryMap: Record<string, string> = {
      'view': 'exploration',
      'like': 'interaction',
      'save': 'interaction',
      'offer': 'offers',
      'register': 'milestones',
      'profile_complete': 'milestones'
    };
    return categoryMap[actionType] || 'exploration';
  }

  private static doesActionMatchAchievement(actionType: string, achievement: Achievement): boolean {
    const actionAchievementMap: Record<string, string[]> = {
      'view': ['first_view', 'property_explorer', 'house_hunter', 'property_connoisseur'],
      'like': ['first_like', 'heart_collector', 'speed_demon'],
      'save': ['first_save', 'collection_master'],
      'offer': ['first_offer', 'serious_buyer'],
      'register': ['early_adopter'],
      'profile_complete': ['social_butterfly']
    };

    return actionAchievementMap[actionType]?.includes(achievement.name) || false;
  }
}