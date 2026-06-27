import { create } from "zustand";
import { verifyToken } from "@/lib/auth/jwt";
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

    const payload = await verifyToken(token);
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