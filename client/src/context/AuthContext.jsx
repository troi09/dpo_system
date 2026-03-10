import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { logout as logoutService, getCurrentUser, getToken, refreshToken } from "../services/authService";

export const AuthContext = createContext();

const decodeToken = (token) => {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE = 2 * 60 * 1000; // Show warning 2 min before timeout
const WARNING_AT = INACTIVITY_TIMEOUT - WARNING_BEFORE; // 13 minutes

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getCurrentUser());
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const logoutTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const inactivityWarningRef = useRef(null);

  const clearAllTimers = useCallback(() => {
    [logoutTimerRef, warningTimerRef, inactivityTimerRef, inactivityWarningRef].forEach((ref) => {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    });
  }, []);

  const logout = useCallback(() => {
    logoutService();
    setUser(null);
    setShowSessionWarning(false);
    clearAllTimers();
  }, [clearAllTimers]);

  const scheduleAutoLogout = useCallback(() => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    const token = getToken();
    if (!token) return;

    const decoded = decodeToken(token);
    if (!decoded?.exp) return;

    const expiresAtMs = decoded.exp * 1000;
    const delay = expiresAtMs - Date.now();

    if (delay <= 0) {
      logout();
      return;
    }

    logoutTimerRef.current = setTimeout(() => {
      logout();
    }, delay);
  }, [logout]);

  // Inactivity timer management
  const resetInactivityTimer = useCallback(() => {
    if (!getToken()) return;

    setShowSessionWarning(false);

    if (inactivityWarningRef.current) clearTimeout(inactivityWarningRef.current);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

    // Show warning at 13 min
    inactivityWarningRef.current = setTimeout(() => {
      setShowSessionWarning(true);
    }, WARNING_AT);

    // Force logout at 15 min
    inactivityTimerRef.current = setTimeout(() => {
      setShowSessionWarning(false);
      logout();
    }, INACTIVITY_TIMEOUT);
  }, [logout]);

  const extendSession = useCallback(async () => {
    try {
      const data = await refreshToken();
      if (data.user) {
        setUser(data.user);
      }
      setShowSessionWarning(false);
      scheduleAutoLogout();
      resetInactivityTimer();
    } catch {
      logout();
    }
  }, [logout, scheduleAutoLogout, resetInactivityTimer]);

  const login = useCallback((userData) => {
    setUser(userData);
    scheduleAutoLogout();
    resetInactivityTimer();
  }, [scheduleAutoLogout, resetInactivityTimer]);

  const updateUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  }, []);

  // Activity listeners
  useEffect(() => {
    if (!user) return;

    const events = ["mousemove", "keydown", "scroll", "mousedown", "touchstart"];
    const handler = () => resetInactivityTimer();

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetInactivityTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
    };
  }, [user, resetInactivityTimer]);

  useEffect(() => {
    // on load or refresh, check token validity
    scheduleAutoLogout();
    return () => clearAllTimers();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, showSessionWarning, extendSession }}>
      {children}
    </AuthContext.Provider>
  );
};