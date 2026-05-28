import { toast } from "@/hooks/use-toast";

/**
 * Centralized error handler for mutations
 * Reduces boilerplate error handling across components
 */
export function handleMutationError(error: Error, customMessage?: string) {
  console.error("Mutation error:", error);
  
  toast({
    title: customMessage || "Operation Failed",
    description: error.message || "An unexpected error occurred. Please try again.",
    variant: "destructive",
  });
}

/**
 * Error handler for query operations
 */
export function handleQueryError(error: Error, customMessage?: string) {
  console.error("Query error:", error);
  
  toast({
    title: customMessage || "Failed to Load Data",
    description: error.message || "Could not retrieve the requested information.",
    variant: "destructive",
  });
}

/**
 * Generic error handler with custom title and description
 */
export function handleError(error: Error, title: string, description?: string) {
  console.error(`${title}:`, error);
  
  toast({
    title,
    description: description || error.message || "An unexpected error occurred.",
    variant: "destructive",
  });
}
