import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

export interface OrgSession {
  orgId: number;
  orgName: string;
  token: string;
}

export interface CallerSession {
  callerId: number;
  callerName: string;
  campus: string;
}

interface AppContextValue {
  orgSession: OrgSession | null;
  callerSession: CallerSession | null;
  selectedCampus: string | null;
  selectedService: string | null;
  selectedDate: string | null;
  isLoading: boolean;
  loginOrg: (email: string, password: string) => Promise<void>;
  signupOrg: (orgName: string, contactName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginCaller: (callerId: number, callerName: string, campus: string) => void;
  logoutCaller: () => Promise<void>;
  selectCampusService: (campus: string, service: string, date: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [orgSession, setOrgSession] = useState<OrgSession | null>(null);
  const [callerSession, setCallerSession] = useState<CallerSession | null>(null);
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(async () => {
      const str = await AsyncStorage.getItem("orgSession");
      if (!str) return null;
      try { return JSON.parse(str).token ?? null; } catch { return null; }
    });
    (async () => {
      try {
        const orgStr = await AsyncStorage.getItem("orgSession");
        if (orgStr) setOrgSession(JSON.parse(orgStr));
        const callerStr = await AsyncStorage.getItem("callerSession");
        if (callerStr) setCallerSession(JSON.parse(callerStr));
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const loginOrg = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${BASE}/api/orgs/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Login failed" }));
      throw new Error(err.message ?? "Login failed");
    }
    const data = await res.json();
    const session: OrgSession = { orgId: data.orgId, orgName: data.orgName, token: data.token };
    setOrgSession(session);
    await AsyncStorage.setItem("orgSession", JSON.stringify(session));
  }, []);

  const signupOrg = useCallback(async (orgName: string, contactName: string, email: string, password: string) => {
    const res = await fetch(`${BASE}/api/orgs/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: orgName, contactName, email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Signup failed" }));
      throw new Error(err.message ?? "Signup failed");
    }
    const data = await res.json();
    const session: OrgSession = { orgId: data.orgId, orgName: data.orgName, token: data.token };
    setOrgSession(session);
    await AsyncStorage.setItem("orgSession", JSON.stringify(session));
  }, []);

  const logout = useCallback(async () => {
    setOrgSession(null);
    setCallerSession(null);
    await AsyncStorage.multiRemove(["orgSession", "callerSession"]);
  }, []);

  const loginCaller = useCallback((callerId: number, callerName: string, campus: string) => {
    const session: CallerSession = { callerId, callerName, campus };
    setCallerSession(session);
    AsyncStorage.setItem("callerSession", JSON.stringify(session));
  }, []);

  const logoutCaller = useCallback(async () => {
    setCallerSession(null);
    await AsyncStorage.removeItem("callerSession");
  }, []);

  const selectCampusService = useCallback((campus: string, service: string, date: string) => {
    setSelectedCampus(campus);
    setSelectedService(service);
    setSelectedDate(date);
  }, []);

  return (
    <AppContext.Provider value={{
      orgSession, callerSession, selectedCampus, selectedService, selectedDate,
      isLoading, loginOrg, signupOrg, logout, loginCaller, logoutCaller, selectCampusService,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
