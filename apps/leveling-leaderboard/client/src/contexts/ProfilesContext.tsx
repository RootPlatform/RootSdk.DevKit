import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { rootClient, RootClientUserEvent } from "@rootsdk/client-app";
import type { UserProfile as SdkUserProfile } from "@rootsdk/client-app";

// ============================================================================
// ProfilesContext — batched user profile cache.
//
// Components call request(userIds) to ask for profiles they need. Requests
// within a tick are batched into a single rootClient.users.getUserProfiles()
// call. Profiles are cached by userId and updated live via the
// UserProfileUpdate event — so nickname and avatar changes propagate in
// real time without a refetch.
//
// `knownRef` grows with each requested user and is never pruned — bounded by
// how many distinct members a session interacts with. For community-scale
// apps (~10K ever-seen users, ~30 bytes per ID) this is ~300KB, acceptable.
// Production deployments with much larger member pools may want LRU eviction.
// ============================================================================

export interface UserProfile {
  id: string;
  nickname: string;
  profilePictureUri: string | undefined;
}

export interface ProfilesState {
  // Sparse cache. Missing IDs return undefined until loaded.
  profiles: Record<string, UserProfile | undefined>;
  // Request profiles by userId. Cheap to call with IDs already in the cache.
  request: (userIds: string[]) => void;
}

const ProfilesCtx = createContext<ProfilesState | undefined>(undefined);

function toProfile(p: SdkUserProfile): UserProfile {
  return {
    id: p.id,
    nickname: p.nickname,
    profilePictureUri: p.profilePictureUri,
  };
}

export const ProfilesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [profiles, setProfiles] = useState<Record<string, UserProfile | undefined>>({});
  const knownRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flush = useCallback(async () => {
    flushTimerRef.current = undefined;
    const ids = [...pendingRef.current];
    pendingRef.current.clear();
    if (ids.length === 0) return;
    for (const id of ids) knownRef.current.add(id);
    try {
      const fetched = await rootClient.users.getUserProfiles(ids);
      setProfiles((prev) => {
        const next = { ...prev };
        for (const p of fetched) {
          next[p.id] = toProfile(p);
        }
        return next;
      });
    } catch (err) {
      console.error("[ProfilesContext] getUserProfiles failed:", err);
      // Un-mark so a later request retries.
      for (const id of ids) knownRef.current.delete(id);
    }
  }, []);

  const request = useCallback(
    (userIds: string[]) => {
      let added = false;
      for (const id of userIds) {
        if (knownRef.current.has(id) || pendingRef.current.has(id)) continue;
        pendingRef.current.add(id);
        added = true;
      }
      if (added && flushTimerRef.current === undefined) {
        flushTimerRef.current = setTimeout(() => {
          void flush();
        }, 0);
      }
    },
    [flush],
  );

  useEffect(() => {
    // Only update users we already know about. The platform fires
    // UserProfileUpdate for any profile change in the community, including
    // users we've never rendered; caching those would grow the cache
    // unboundedly with profiles no consumer will ever read.
    const onUpdate = (profile: SdkUserProfile) => {
      if (!knownRef.current.has(profile.id)) return;
      setProfiles((prev) => ({ ...prev, [profile.id]: toProfile(profile) }));
    };
    rootClient.users.on(RootClientUserEvent.UserProfileUpdate, onUpdate);
    return () => {
      rootClient.users.off(RootClientUserEvent.UserProfileUpdate, onUpdate);
    };
  }, []);

  const value: ProfilesState = { profiles, request };
  return <ProfilesCtx.Provider value={value}>{children}</ProfilesCtx.Provider>;
};

export function useProfiles(): ProfilesState {
  const v = useContext(ProfilesCtx);
  if (!v) throw new Error("useProfiles must be used inside <ProfilesProvider>");
  return v;
}
