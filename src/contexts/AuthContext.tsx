/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/router";

const BASE_URL = "http://127.0.0.1:8000/"; // Update your backend base url here

interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isTokenValid: () => boolean;
  fetchWithTokenRefresh: (
    url: string,
    options?: RequestInit
  ) => Promise<Response>;
}

interface SignupData {
  username: string;
  password: string;
  email: string;
  first_name: string;
  last_name: string;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("Token from localStorage:", token);
    if (token && isTokenValid()) {
      console.log("Token is valid, fetching user data");
      fetchUserData(token);
    } else {
      console.log("Token is invalid or missing");
      localStorage.removeItem("token");
      localStorage.removeItem("tokenExpiry");
      setLoading(false);
    }
  }, []);

  const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await fetch(`${BASE_URL}/iam/token/refresh/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const data = await response.json();
      localStorage.setItem("token", data.access);
      localStorage.setItem(
        "tokenExpiry",
        new Date(Date.now() + 30 * 60 * 1000).toISOString()
      );

      return data.access;
    } catch (error) {
      console.error("Error refreshing token:", error);
      logout();
      throw error;
    }
  };

  const fetchUserData = async (token: string) => {
    try {
      const response = await fetch(`${BASE_URL}/iam/me/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else if (response.status === 401) {
        // Token is invalid, try to refresh
        try {
          const newToken = await refreshAccessToken();
          // Retry the request with new token
          const retryResponse = await fetch(`${BASE_URL}/iam/me/`, {
            headers: {
              Authorization: `Bearer ${newToken}`,
            },
          });

          if (retryResponse.ok) {
            const userData = await retryResponse.json();
            setUser(userData);
          } else {
            throw new Error("Failed to fetch user data after token refresh");
          }
        } catch (refreshError) {
          console.error("Error refreshing token:", refreshError);
          logout();
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      logout();
    }
    setLoading(false);
  };

  // Add this utility function to handle API calls with token refresh
  const fetchWithTokenRefresh = async (
    url: string,
    options: RequestInit = {}
  ) => {
    try {
      // First try with current token
      const token = localStorage.getItem("token");
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        // Token expired, try to refresh
        const newToken = await refreshAccessToken();

        // Retry the request with new token
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${newToken}`,
          },
        });
      }

      return response;
    } catch (error) {
      console.error("Error in fetchWithTokenRefresh:", error);
      throw error;
    }
  };

  const login = async (username: string, password: string) => {
    try {
      console.log("Attempting login with:", { username });

      const response = await fetch(`${BASE_URL}/iam/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      console.log("Login response status:", response.status);
      const data = await response.json();
      console.log("Login response data:", data);

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (!data.accessToken) {
        throw new Error("No access token received from server");
      }

      // Store both tokens
      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem(
        "tokenExpiry",
        new Date(Date.now() + 30 * 60 * 1000).toISOString()
      ); // 30 minutes for access token

      // Decode the access token to get user info
      const tokenPayload = JSON.parse(atob(data.accessToken.split(".")[1]));
      const userData = {
        id: tokenPayload.user_id,
        username: tokenPayload.username,
        email: tokenPayload.email,
        first_name: tokenPayload.first_name || "",
        last_name: tokenPayload.last_name || "",
      };

      setUser(userData);
      router.push("/dashboard/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const signup = async (data: SignupData) => {
    try {
      const response = await fetch(`${BASE_URL}/iam/signup/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Signup failed");
      }

      // After successful signup, log the user in
      await login(data.username, data.password);
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("tokenExpiry");
    setUser(null);
    router.push("/");
  };

  const isTokenValid = () => {
    const expiry = localStorage.getItem("tokenExpiry");
    if (!expiry) return false;
    return new Date(expiry) > new Date();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        login,
        signup,
        logout,
        loading,
        isTokenValid,
        fetchWithTokenRefresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
