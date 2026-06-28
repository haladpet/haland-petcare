import { create } from "zustand";
import { verifyTokenClient } from "@/lib/auth/jwt-client";
import { getLocalBrowserDb } from "@/lib/db/local/client.browser";
import { localUsers } from "@/lib/db/local/schema";
import { eq } from "drizzle-orm";
import type { AuthPayload } from "@/types/auth";

type User = {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  clinic_id?: string;
} | null;

type AuthState = {
  user: User;
  accessToken: string | null;
  refreshToken: string | null;
  deviceId: string | null;
  sessionId: string | null;
  isOnline: boolean;
  login: (data: {
    user: User;
    accessToken: string;
    refreshToken: string;
    deviceId?: string;
    sessionId?: string;
  }) => void;
  logout: () => void;
  refreshSession: () => Promise<void>;
};

// ─── Cookie Helpers ─────────────────────────────────────────────
function setCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Strict; Max-Age=${maxAge}`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; SameSite=Strict; Max-Age=0`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function parseUser(raw: string): User {
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

// ─── Rehydrate from cookies + sessionStorage ────────────────────
function rehydrate() {
  if (typeof window === "undefined") return;

  const accessToken = getCookie("_hp_at");
  const refreshToken = getCookie("_hp_rt");
  const rawUser = sessionStorage.getItem("_hp_user");

  if (accessToken && refreshToken) {
    const user = rawUser ? parseUser(rawUser) : null;
    useAuthStore.setState({
      user,
      accessToken,
      refreshToken,
    });
  }
}

// Auto-rehydrate on load
if (typeof window !== "undefined") {
  rehydrate();
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  deviceId: null,
  sessionId: null,
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,

  login: (data) => {
    set({
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      deviceId: data.deviceId || null,
      sessionId: data.sessionId || null,
    });

    // Persist to cookies (7 days max-age)
    const maxAge = 7 * 24 * 60 * 60;
    setCookie("_hp_at", data.accessToken, maxAge);
    setCookie("_hp_rt", data.refreshToken, maxAge);

    // Persist user to sessionStorage
    if (typeof window !== "undefined") {
      sessionStorage.setItem("_hp_user", JSON.stringify(data.user));
    }

    if (data.user) {
      syncUserToLocalDb(data.user);
    }
  },

  logout: () => {
    const state = get();

    if (state.refreshToken) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: state.refreshToken }),
      }).catch(() => {
        // Ignore network errors during logout
      });
    }

    // Clear cookies
    deleteCookie("_hp_at");
    deleteCookie("_hp_rt");

    // Clear sessionStorage
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("_hp_user");
    }

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      deviceId: null,
      sessionId: null,
    });
  },

  refreshSession: async () => {
    const state = get();
    const currentRefreshToken = state.refreshToken;
    if (!currentRefreshToken) return;

    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });

      if (!res.ok) {
        get().logout();
        return;
      }

      const data = await res.json();
      set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || currentRefreshToken,
        sessionId: data.sessionId || state.sessionId,
      });
    } catch {
      // Network error — stay logged in with existing tokens
    }
  },
}));

// Auto refresh before expiry (check every 60 seconds)
if (typeof window !== "undefined") {
  setInterval(async () => {
    const state = useAuthStore.getState();
    const token = state.accessToken;
    if (!token) return;

    const payload = await verifyTokenClient(token);
    if (!payload) {
      await state.refreshSession();
      return;
    }

    const exp = payload.exp ? Number(payload.exp) * 1000 : 0;
    const now = Date.now();
    const ttl = exp - now;

    if (ttl < 5 * 60 * 1000) {
      await state.refreshSession();
    }
  }, 60 * 1000);
}

// Online/offline detection
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    useAuthStore.setState({ isOnline: true });
  });
  window.addEventListener("offline", () => {
    useAuthStore.setState({ isOnline: false });
  });
}

/**
 * Sync user data to local PGlite database for offline access.
 * Uses IndexedDB-backed PGlite (browser client).
 */
export async function syncUserToLocalDb(user: User) {
  if (!user) return;

  try {
    const db = getLocalBrowserDb();

    const [existing] = await db
      .select({ id: localUsers.id })
      .from(localUsers)
      .where(eq(localUsers.id, user.id))
      .limit(1);

    if (existing) {
      await db
        .update(localUsers)
        .set({
          email: user.email || "",
          full_name: user.full_name || "",
          role: user.role || "CUSTOMER",
          clinic_id: user.clinic_id || "",
          updated_at: new Date(),
        })
        .where(eq(localUsers.id, user.id));
    } else {
      await db.insert(localUsers).values({
        id: user.id,
        email: user.email || "",
        full_name: user.full_name || "",
        role: user.role || "CUSTOMER",
        clinic_id: user.clinic_id || "",
        status: "ACTIVE",
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  } catch (err) {
    console.error("syncUserToLocalDb error:", err);
  }
}