import { Property } from "@shared/schema";

const LIKED_PROPERTIES_KEY = "liked_properties";
const USER_SESSION_KEY = "user_session";

export interface LikedProperty {
  property: Property;
  likedAt: Date;
  action: "like" | "super_like";
}

export interface UserSession {
  isLoggedIn: boolean;
  userId?: string;
  email?: string;
  name?: string;
}

export class LocalStorageService {
  // Liked Properties Management
  static getLikedProperties(): LikedProperty[] {
    try {
      const stored = localStorage.getItem(LIKED_PROPERTIES_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return parsed.map((item: any) => ({
        ...item,
        likedAt: new Date(item.likedAt)
      }));
    } catch (error) {
      return [];
    }
  }

  static addLikedProperty(property: Property, action: "like" | "super_like" = "like"): void {
    try {
      const likedProperties = this.getLikedProperties();
      
      // Check if property already exists
      const existingIndex = likedProperties.findIndex(
        item => item.property.id === property.id
      );
      
      if (existingIndex >= 0) {
        // Update existing
        likedProperties[existingIndex] = {
          property,
          likedAt: new Date(),
          action
        };
      } else {
        // Add new
        likedProperties.push({
          property,
          likedAt: new Date(),
          action
        });
      }
      
      localStorage.setItem(LIKED_PROPERTIES_KEY, JSON.stringify(likedProperties));
    } catch (error) {
    }
  }

  static removeLikedProperty(propertyId: string): void {
    try {
      const likedProperties = this.getLikedProperties();
      const filtered = likedProperties.filter(
        item => item.property.id !== propertyId
      );
      localStorage.setItem(LIKED_PROPERTIES_KEY, JSON.stringify(filtered));
    } catch (error) {
    }
  }

  static clearLikedProperties(): void {
    try {
      localStorage.removeItem(LIKED_PROPERTIES_KEY);
    } catch (error) {
    }
  }

  // User Session Management
  static getUserSession(): UserSession {
    try {
      const stored = localStorage.getItem(USER_SESSION_KEY);
      if (!stored) return { isLoggedIn: false };
      
      return JSON.parse(stored);
    } catch (error) {
      return { isLoggedIn: false };
    }
  }

  static setUserSession(session: UserSession): void {
    try {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
    } catch (error) {
    }
  }

  static clearUserSession(): void {
    try {
      localStorage.removeItem(USER_SESSION_KEY);
    } catch (error) {
    }
  }

  // Sync Methods (for when user logs in)
  static async syncLikedPropertiesToServer(userId: string): Promise<void> {
    try {
      const likedProperties = this.getLikedProperties();
      
      for (const likedItem of likedProperties) {
        // Send each liked property to server
        await fetch("/api/swipes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userId,
            propertyId: likedItem.property.id,
            action: likedItem.action
          })
        });
      }
    } catch (error) {
      throw error;
    }
  }

  static async syncLikedPropertiesFromServer(userId: string): Promise<void> {
    try {
      const response = await fetch(`/api/swipes/${userId}`);
      if (!response.ok) return;
      
      const serverSwipes = await response.json();
      const likedSwipes = serverSwipes.filter((swipe: any) => 
        swipe.action === 'like' || swipe.action === 'super_like'
      );

      // Get property details for each swipe
      const likedProperties: LikedProperty[] = [];
      
      for (const swipe of likedSwipes) {
        try {
          const propResponse = await fetch(`/api/properties/${swipe.propertyId}`);
          if (propResponse.ok) {
            const property = await propResponse.json();
            likedProperties.push({
              property,
              likedAt: new Date(swipe.createdAt),
              action: swipe.action
            });
          }
        } catch (error) {
        }
      }

      // Merge with local storage (server data takes precedence)
      localStorage.setItem(LIKED_PROPERTIES_KEY, JSON.stringify(likedProperties));
    } catch (error) {
      throw error;
    }
  }
}