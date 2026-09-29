import { useEffect, useState } from "react";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from "../api/authApi";
import { AuthContext } from "./appAuthContext";
import { disablePhoneAlerts } from "../mobile/push";
import { resourceCache } from "../utils/resourceCache";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await getCurrentUser();
        resourceCache.scope(response.user.id);
        setUser(response.user);
      } catch {
        resourceCache.scope(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrentUser();
  }, []);

  const login = async (credentials) => {
    const response = await loginUser(credentials);
    resourceCache.scope(response.user.id);
    setUser(response.user);
    return response;
  };

  const register = async (formData) => {
    const response = await registerUser(formData);
    resourceCache.scope(response.user.id);
    setUser(response.user);
    return response;
  };

  const logout = async () => {
    if (user) await disablePhoneAlerts(user.id);
    await logoutUser();
    resourceCache.scope(null);
    setUser(null);
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

