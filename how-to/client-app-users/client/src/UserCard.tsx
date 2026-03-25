// ============================================================================
// How-To: Client Users — UserCard Component
// SDK: rootClient.users — user profiles, presence, profile pictures, events
// ============================================================================
//
// Demonstrates every rootClient.users method:
//   - getCurrentUserId()      — get the logged-in user's ID
//   - getUserProfile(userId)  — fetch a single profile
//   - getUserProfiles(userIds)— batch fetch multiple profiles
//   - showUserProfile(userId) — open native profile UI
//   - on(UserProfileUpdate)   — subscribe to profile change events
//
// Also shows rootClient.assets.toImageUrl() for rendering profile pictures.
//
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";

import {
  rootClient,
  UserProfile,
  CommunityUserOnlineStatus,
  RootClientUserEvent,
} from "@rootsdk/client-app";

// ImageUriResolution is a string literal type, not an enum.
// Valid values: "original" | "large" | "medium" | "small"
import type { ImageUriResolution } from "@rootsdk/client-app";

// --- HELPERS -----------------------------------------------------------------

// Map CommunityUserOnlineStatus enum to display text.
function statusLabel(status: CommunityUserOnlineStatus): string {
  switch (status) {
    case CommunityUserOnlineStatus.OnlineAndAttached:
      return "Online (active)";
    case CommunityUserOnlineStatus.AwayAndAttached:
      return "Away (connected)";
    case CommunityUserOnlineStatus.Online:
      return "Online";
    case CommunityUserOnlineStatus.Away:
      return "Away";
    case CommunityUserOnlineStatus.Offline:
      return "Offline";
    default:
      return "Unknown";
  }
}

// Convert an asset URI to a displayable image URL.
// Uses rootClient.assets.toImageUrl() with "small" resolution for avatars.
// ImageUriResolution values: "original" | "large" | "medium" | "small"
function profilePictureUrl(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  return rootClient.assets.toImageUrl(uri, "small");
}

// --- COMPONENT ---------------------------------------------------------------

export const UserCard: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // 1. Get current user ID (synchronous)
  useEffect(() => {
    try {
      const userId = rootClient.users.getCurrentUserId();
      setCurrentUserId(userId);
      addLog(`getCurrentUserId() -> ${userId}`);
    } catch (err: unknown) {
      setError(`getCurrentUserId failed: ${err}`);
    }
  }, [addLog]);

  // 2. Fetch current user's profile (async)
  useEffect(() => {
    if (!currentUserId) return;

    async function fetchProfile() {
      try {
        // getUserProfile — fetch a single user's profile by ID.
        // Returns UserProfile: { id, nickname, profilePictureUri?, onlineStatus }
        const userProfile = await rootClient.users.getUserProfile(currentUserId);
        setProfile(userProfile);
        addLog(
          `getUserProfile() -> nickname=${userProfile.nickname} ` +
          `status=${statusLabel(userProfile.onlineStatus)}`,
        );

        // getUserProfiles — batch fetch multiple profiles in one call.
        // Useful when rendering a member list or participant roster.
        const profiles = await rootClient.users.getUserProfiles([currentUserId]);
        addLog(`getUserProfiles([1 id]) -> ${profiles.length} profile(s)`);
      } catch (err: unknown) {
        setError(`Profile fetch failed: ${err}`);
      }
    }

    fetchProfile();
  }, [currentUserId, addLog]);

  // 3. Subscribe to profile update events
  useEffect(() => {
    // The UserProfileUpdate event fires when any user's profile changes
    // (nickname, profile picture, online status). Use this to keep displayed
    // profiles in sync without polling.
    //
    function onProfileUpdate(updatedProfile: UserProfile) {
      addLog(
        `Profile update event: ${updatedProfile.nickname} ` +
        `(${statusLabel(updatedProfile.onlineStatus)})`,
      );
      // If this is our own profile, update the displayed card.
      if (updatedProfile.id === currentUserId) {
        setProfile(updatedProfile);
      }
    }

    rootClient.users.on(RootClientUserEvent.UserProfileUpdate, onProfileUpdate);

    return () => {
      rootClient.users.off(RootClientUserEvent.UserProfileUpdate, onProfileUpdate);
    };
  }, [currentUserId, addLog]);

  // 4. Open native profile UI
  function handleShowProfile() {
    if (!currentUserId) return;
    // showUserProfile — opens the platform's native profile popup for the user.
    // This is a fire-and-forget call with no return value.
    rootClient.users.showUserProfile(currentUserId);
    addLog(`showUserProfile(${currentUserId})`);
  }

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      <h2>User Profile</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {profile && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Profile picture using rootClient.assets.toImageUrl() */}
          {profile.profilePictureUri && (
            <img
              src={profilePictureUrl(profile.profilePictureUri)}
              alt={profile.nickname}
              style={{ width: 48, height: 48, borderRadius: "50%" }}
            />
          )}
          <div>
            <div style={{ fontWeight: "bold" }}>{profile.nickname}</div>
            <div style={{ fontSize: 12, color: "#666" }}>
              {statusLabel(profile.onlineStatus)}
            </div>
            <div style={{ fontSize: 11, color: "#999" }}>{profile.id}</div>
          </div>
          <button onClick={handleShowProfile} style={{ marginLeft: 8 }}>
            View Profile
          </button>
        </div>
      )}

      <h3>Event Log</h3>
      <div
        style={{
          fontFamily: "monospace",
          fontSize: 12,
          background: "#f5f5f5",
          padding: 8,
          maxHeight: 200,
          overflow: "auto",
        }}
      >
        {log.map((entry, i) => (
          <div key={i}>{entry}</div>
        ))}
      </div>
    </div>
  );
};
