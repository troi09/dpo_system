import { createContext, useEffect, useRef, useState } from "react";
import { logout as logoutService, getCurrentUser, getToken } from "../services/authService";

export const AuthContext = createContext();

const decodeToken = (token) => {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getCurrentUser());
  const logoutTimerRef = useRef(null);

  const clearLogoutTimer = () => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  };

  const scheduleAutoLogout = () => {
    clearLogoutTimer();
    const token = getToken();
    if (!token) return;

    const decoded = decodeToken(token);
    if (!decoded?.exp) return;

    const expiresAtMs = decoded.exp * 1000;
    const delay = expiresAtMs - Date.now();

    if (delay <= 0) {
      alert("Session expired. Please log in again.");
      logout();
      return;
    }

    logoutTimerRef.current = setTimeout(() => {
      alert("Session expired. Please log in again.");
      logout();
    }, delay);
  };

  const login = (userData) => {
    setUser(userData);
    scheduleAutoLogout();
  };

  const logout = () => {
    logoutService();
    setUser(null);
    clearLogoutTimer();
  };

  useEffect(() => {
    // on load or refresh, check token validity
    scheduleAutoLogout();

    return () => clearLogoutTimer();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};