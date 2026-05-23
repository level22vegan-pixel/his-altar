import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

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

export interface CampusSession {
  campus: string;
  role: string;
  adminCode?: string;
}

interface AppContextValue {
  orgSession: OrgSession | null;
  callerSession: CallerSession | null;
  campusSession: CampusSession | null;
  selectedCampus: string | null;
  selectedService: string | null;
  selectedDate: string | null;
  isLoading: boolean;
  loginOrg: (email: string, password: string) => Promise<void>;
  signupOrg: (orgName: string, contactName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginCaller: (callerId: number, callerName: string, campus: string) => void;
  logoutCaller: () => Promise<void>;
  loginCampus: (campus: string, role: string, adminCode?: string) => void;
  logoutCampus: () => Promise<void>;
  selectCampusService: (campus: string, service: string, date: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

async function registerPushToken(campus: string, orgToken?: string) {
  if (Platform.OS === "web") return;
  if (!Device.isDevice) return;
  try {
    const existing = await Notifications.getPermissionsAsync();
    let granted = (existing as unknown as { granted: boolean }).granted;
    if (!granted) {
      const result = await Notifications.requestPermissionsAsync();
      granted = (result as unknown as { granted: boolean }).granted;
    }
    if (!granted) return;
    const { data: pushToken } = await Notifications.getExpoPushTokenAsync();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (orgToken) headers["Authorization"] = `Bearer ${orgToken}`;
    await fetch(`${BASE}/api/notifications/register`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        token: pushToken,
        campus,
        deviceName: Device.deviceName ?? "",
      }),
    });
  } catch {}
}

export interface NotificationHistoryEntry {
  id: string;
  title: string;
  body: string;
  type?: string;
  receivedAt: string;
}

export const NOTIF_HISTORY_KEY = "notificationHistory";

export async function addToNotifHistory(entry: NotificationHistoryEntry) {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_HISTORY_KEY);
    const history: NotificationHistoryEntry[] = raw ? JSON.parse(raw) : [];
    const updated = [entry, ...history].slice(0, 50);
    await AsyncStorage.setItem(NOTIF_HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [orgSession, setOrgSession] = useState<OrgSession | null>(null);
  const [callerSession, setCallerSession] = useState<CallerSession | null>(null);
  const [campusSession, setCampusSessionState] = useState<CampusSession | null>(null);
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
        const campusStr = await AsyncStorage.getItem("campusSession");
        if (campusStr) {
          setCampusSessionState(JSON.parse(campusStr));
        } else if (orgStr) {
          // Org admin always gets campus admin session, even on fresh app load
          const adminCampus: CampusSession = { campus: "main", role: "admin" };
          setCampusSessionState(adminCampus);
          await AsyncStorage.setItem("campusSession", JSON.stringify(adminCampus));
        }
      } catch {}
      setIsLoading(false);
    })();

    // Save every incoming notification to local history
    if (Platform.OS !== "web") {
      const sub = Notifications.addNotificationReceivedListener((notification) => {
        addToNotifHistory({
          id: notification.request.identifier,
          title: notification.request.content.title ?? "",
          body: notification.request.content.body ?? "",
          type: (notification.request.content.data as any)?.type ?? "",
          receivedAt: new Date().toISOString(),
        });
      });
      return () => sub.remove();
    }
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
    const adminCampus: CampusSession = { campus: "main", role: "admin" };
    setCampusSessionState(adminCampus);
    await AsyncStorage.setItem("campusSession", JSON.stringify(adminCampus));
    registerPushToken("main", session.token);
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
    // Org admin automatically gets full campus admin access
    const adminCampus: CampusSession = { campus: "main", role: "admin" };
    setCampusSessionState(adminCampus);
    await AsyncStorage.setItem("campusSession", JSON.stringify(adminCampus));
  }, []);

  const logout = useCallback(async () => {
    setOrgSession(null);
    setCallerSession(null);
    setCampusSessionState(null);
    await AsyncStorage.multiRemove(["orgSession", "callerSession", "campusSession"]);
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

  const loginCampus = useCallback((campus: string, role: string, adminCode?: string) => {
    const session: CampusSession = { campus, role, ...(adminCode ? { adminCode } : {}) };
    setCampusSessionState(session);
    AsyncStorage.setItem("campusSession", JSON.stringify(session));
    registerPushToken(campus);
  }, []);

  const logoutCampus = useCallback(async () => {
    setCampusSessionState(null);
    await AsyncStorage.removeItem("campusSession");
  }, []);

  const selectCampusService = useCallback((campus: string, service: string, date: string) => {
    setSelectedCampus(campus);
    setSelectedService(service);
    setSelectedDate(date);
  }, []);

  return (
    <AppContext.Provider value={{
      orgSession, callerSession, campusSession,
      selectedCampus, selectedService, selectedDate,
      isLoading, loginOrg, signupOrg, logout,
      loginCaller, logoutCaller, loginCampus, logoutCampus,
      selectCampusService,
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
