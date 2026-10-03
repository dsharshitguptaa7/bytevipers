"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: "visitor" | "student" | "teacher" | "coordinator" | string;
  gender?: "Male" | "Female" | string;
  coordinator_position?: string;
  is_active: boolean;
  is_suspended: boolean;
  suspension_reason?: string;
  permissions: string[];
  verification_status?: "not_submitted" | "pending" | "approved" | "rejected" | string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: { username_or_email: string; password: string }) => Promise<User>;
  register: (data: { email: string; username: string; full_name: string; password: string; gender: string }) => Promise<any>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem("bytevipers_token");
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const userData = await api.getMe();
      if (userData && userData.verification_status) {
        userData.verification_status = userData.verification_status.toLowerCase();
      }
      setUser(userData);
    } catch {
      localStorage.removeItem("bytevipers_token");
      localStorage.removeItem("bytevipers_refresh_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: { username_or_email: string; password: string }) => {
    const res = await api.login(credentials);
    localStorage.setItem("bytevipers_token", res.access_token);
    localStorage.setItem("bytevipers_refresh_token", res.refresh_token);
    const u = res.user;
    if (u && u.verification_status) {
      u.verification_status = u.verification_status.toLowerCase();
    }
    setUser(u);
    return u;
  };

  const register = async (data: { email: string; username: string; full_name: string; password: string; gender: string }) => {
    const res = await api.register(data);
    return res;
  };

  const logout = () => {
    localStorage.removeItem("bytevipers_token");
    localStorage.removeItem("bytevipers_refresh_token");
    setUser(null);
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role !== "teacher") return false;
    if (user.permissions.includes("platform.superadmin")) return true;
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
