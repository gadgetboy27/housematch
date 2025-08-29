import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Simple authentication middleware for demo purposes
// In production, this would validate JWT tokens or session cookies
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  // For now, we'll require x-user-id header for authentication
  // In production, extract from JWT token or session
  const username = req.headers['x-user-id'] as string;
  
  if (!username) {
    return res.status(401).json({ message: 'Authentication required - please provide x-user-id header' });
  }
  
  try {
    // For demo purposes, create user if it doesn't exist
    const { storage } = await import('../storage');
    let user = await storage.getUserByUsername(username);
    
    if (!user) {
      // Create demo user with fixed ID for development
      user = await storage.createUser({
        id: username, // Use username as ID for simplicity
        username: username,
        password: 'demo123'
      });
    }
    
    req.userId = user.id;
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Authentication failed' });
  }
};

// Middleware to check if user owns the property
export const requirePropertyOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Import storage here to avoid circular dependencies
    const { storage } = await import('../storage');
    
    const propertyId = req.params.id;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const property = await storage.getProperty(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    if (property.userId !== userId) {
      return res.status(403).json({ message: 'Access denied: You can only modify your own properties' });
    }
    
    next();
  } catch (error) {
    console.error('Property ownership check failed:', error);
    res.status(500).json({ message: 'Authorization check failed' });
  }
};