import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const contentType = res.headers.get('content-type');
    let errorMessage = res.statusText;
    
    // Try to extract error message based on content type
    if (contentType?.includes('application/json')) {
      try {
        const json = await res.json();
        errorMessage = json.message || JSON.stringify(json);
      } catch {
        errorMessage = await res.text();
      }
    } else {
      errorMessage = await res.text();
    }
    
    throw new Error(`${res.status}: ${errorMessage || res.statusText}`);
  }
}

// Helper function to get CSRF token from cookie
function getCSRFToken(): string | null {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf-token') {
      return value;
    }
  }
  return null;
}

// Helper function to ensure CSRF token is available
async function ensureCSRFToken(): Promise<string | null> {
  let token = getCSRFToken();
  if (!token) {
    // Request a new CSRF token
    try {
      await fetch('/api/csrf', { credentials: 'include' });
      token = getCSRFToken();
    } catch (error) {
      console.warn('Failed to fetch CSRF token:', error);
    }
  }
  return token;
}

// Helper to safely parse JSON responses
async function safeJsonParse(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to parse JSON response:', text);
    throw new Error(`Invalid JSON response from server: ${text.substring(0, 100)}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  // Add CSRF token for non-GET requests
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    const csrfToken = await ensureCSRFToken();
    if (csrfToken) {
      headers["x-csrf-token"] = csrfToken;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// Helper to make API requests and automatically parse JSON
export async function apiRequestJson<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  const res = await apiRequest(method, url, data);
  return safeJsonParse(res);
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
