import { useEffect, useState } from "react";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from "../api/authApi";
import { AuthContext } from "./appAuthContext";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await getCurrentUser();
        setUser(response.user);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrentUser();
  }, []);

  const login = async (credentials) => {
    const response = await loginUser(credentials);
    setUser(response.user);
    return response;
  };

  const register = async (formData) => {
    const response = await registerUser(formData);
    setUser(response.user);
    return response;
  };

  const logout = async () => {
    await logoutUser();
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

