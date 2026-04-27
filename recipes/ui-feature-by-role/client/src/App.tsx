// ============================================================================
// Recipe: UI Feature Gating by Role — Client
// Composes: client-app-users + networking-app-services
// ============================================================================
//
// Fetches the viewer's context (am I a moderator? am I the owner?) on mount
// and re-fetches whenever the server broadcasts RolesChanged. Renders three
// UI sections gated by the resulting flags:
//
//   - Member section   — visible to everyone in the community
//   - Moderator panel  — visible to moderators OR the owner
//   - Owner controls   — visible only to the owner
//
// IMPORTANT — UI gating is for VISIBILITY ONLY, not access control. Any
// action that requires elevated privileges must ALSO be enforced server-side.
// A determined user can edit the DOM or call your service client directly.
// See recipe #20 ("How do I gate a client action behind a permission AND
// enforce it server-side?") for the action-enforcement story.
//
// ============================================================================

import React, { useEffect, useState } from "react";
import { rootClient } from "@rootsdk/client-app";
import {
  viewerServiceClient,
  ViewerServiceClientEvent,
} from "@uifeaturebyrole/gen-client";
import { GetViewerContextResponse } from "@uifeaturebyrole/gen-shared";

type ViewerContext = GetViewerContextResponse;

export const App: React.FC = () => {
  const [ctx, setCtx] = useState<ViewerContext | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  // Fetch context on mount + whenever the server broadcasts RolesChanged.
  // The broadcast carries no payload — it's a "go ask again" signal. Each
  // client re-fetches; the server's response is computed against the
  // calling client.userId, so each client gets its own flags.
  //
  // The cancelled flag prevents a stale fetch from clobbering newer state
  // if the component unmounts mid-fetch (or two refetches race).
  useEffect(() => {
    let cancelled = false;

    const fetchContext = async () => {
      try {
        const response = await viewerServiceClient.getViewerContext({});
        if (!cancelled) {
          setCtx(response);
          setError(undefined);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    fetchContext();
    viewerServiceClient.on(ViewerServiceClientEvent.RolesChanged, fetchContext);

    // Always unsubscribe on unmount. Forgetting this leaks listeners and
    // will trigger updates on stale React state setters.
    return () => {
      cancelled = true;
      viewerServiceClient.off(ViewerServiceClientEvent.RolesChanged, fetchContext);
    };
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!ctx) return <Loading />;

  return (
    <main style={pageStyle}>
      <h1 style={{ fontSize: 24, margin: 0 }}>UI Feature Gating by Role</h1>
      <p style={metaStyle}>
        Signed in as <code>{ctx.userId}</code> · {labelFor(ctx)}
      </p>

      {/* Visible to every community member, regardless of role. */}
      <Section title="Member section">
        <p>Everyone in the community sees this. No role check.</p>
      </Section>

      {/* Moderator-or-above. The owner is always elevated, so the OR keeps
          the owner from being hidden if the moderator setting is unset. */}
      {(ctx.isModerator || ctx.isOwner) && (
        <Section title="Moderator panel">
          <p>Visible to users in the configured moderator role and to the owner.</p>
        </Section>
      )}

      {/* Owner-only. */}
      {ctx.isOwner && (
        <Section title="Owner controls">
          <p>Visible to the community owner only.</p>
        </Section>
      )}

      {!ctx.isModerator && !ctx.isOwner && (
        <p style={hintStyle}>
          You're a regular member. Ask a community admin to assign you the
          moderator role to see additional sections.
        </p>
      )}
    </main>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <section style={sectionStyle}>
    <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
    {children}
  </section>
);

const Loading: React.FC = () => <div style={pageStyle}>Loading…</div>;

const ErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div style={{ ...pageStyle, color: "#c00" }}>
    Failed to load viewer context: {message}
  </div>
);

function labelFor(ctx: ViewerContext): string {
  if (ctx.isOwner) return "owner";
  if (ctx.isModerator) return "moderator";
  return "member";
}

// Inline styles so this recipe doesn't bring a CSS toolchain into scope.
// A real app would lift these into CSS modules or design tokens.
const pageStyle: React.CSSProperties = {
  fontFamily: "system-ui, -apple-system, sans-serif",
  padding: 24,
  maxWidth: 640,
  margin: "0 auto",
};

const metaStyle: React.CSSProperties = {
  color: "#666",
  fontSize: 14,
  marginTop: 8,
};

const sectionStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 16,
  marginTop: 16,
};

const hintStyle: React.CSSProperties = {
  color: "#888",
  fontSize: 13,
  marginTop: 24,
};
