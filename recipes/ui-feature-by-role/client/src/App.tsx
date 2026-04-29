// ============================================================================
// Recipe: UI Feature Gating by Role — Client
// Composes: client-app-users + networking-app-services + server-rpc-errors
// ============================================================================
//
// Two layers, both demonstrated here:
//
//   1. UI gating (visibility) — fetch viewer context on mount and on
//      RolesChanged broadcast; render three sections gated by the flags:
//        - Member section   — visible to everyone in the community
//        - Moderator panel  — visible to moderators OR the owner
//        - Owner controls   — visible only to the owner
//
//   2. Server-enforced action — inside the moderator panel, a "View report"
//      button calls getModeratorReport. The server independently checks the
//      caller's role and throws RootServerException(NOT_MODERATOR) if they
//      aren't authorized. We also hide the button client-side, but that's
//      polish; the security boundary is server-side.
//
// IMPORTANT — UI gating is for VISIBILITY ONLY, not access control. A
// determined user can edit the DOM or call the service client directly.
// Always pair UI gating with a matching server-side check on every privileged
// RPC. The matching check on the server is what makes the feature safe.
//
// ============================================================================

import React, { useEffect, useState } from "react";
import {
  rootClient,
  RootServerException,
} from "@rootsdk/client-app";
import {
  viewerServiceClient,
  ViewerServiceClientEvent,
} from "@uifeaturebyrole/gen-client";
import {
  GetViewerContextResponse,
  ViewerError,
} from "@uifeaturebyrole/gen-shared";

type ViewerContext = GetViewerContextResponse;

export const App: React.FC = () => {
  const [ctx, setCtx] = useState<ViewerContext | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  // Fetch context on mount + whenever the server broadcasts RolesChanged.
  // The broadcast carries no payload — it's a "go ask again" signal. Each
  // client re-fetches; the server's response is computed against the
  // calling client.userId, so each client gets its own flags.
  //
  // The cancelled flag prevents a stale fetch from setting state after the
  // component unmounts. It does NOT order concurrent in-flight fetches: if
  // two RolesChanged events fire close together, both fetches run and
  // whichever returns last wins. That's safe here because each response is
  // computed against the calling user, so both fetches converge on the same
  // current truth — the only cost is one wasted render. A production app
  // with a heavier response shape would add a request-generation counter to
  // ignore older responses; for a 3-bool payload it isn't worth the code.
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
          <ModeratorReportButton />
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

/**
 * Calls the server's moderator-only RPC. Renders the returned payload, or
 * the typed authorization error if the server rejects the call.
 *
 * The button being visible at all is the UX layer (its parent is gated on
 * `isModerator || isOwner`). The catch block is the security layer's UX —
 * if the user was demoted between the page render and the click, the call
 * fails with NOT_MODERATOR and we render the error here. Stripped-down
 * approach for the recipe; production apps would also re-fetch viewer
 * context on RolesChanged so demotions hide the button immediately.
 *
 * Why match on err.code rather than err.message: the message is freeform
 * and may change. The numeric code is stable across server versions and
 * comes from the recipe's own proto enum, so client + server stay in sync
 * without coordinating strings.
 */
const ModeratorReportButton: React.FC = () => {
  const [data, setData] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    setError(undefined);
    setData(undefined);
    try {
      const r = await viewerServiceClient.getModeratorReport({});
      setData(r.data);
    } catch (err) {
      if (err instanceof RootServerException && err.code === ViewerError.NOT_MODERATOR) {
        setError("You're no longer authorized to view the report.");
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={handleClick} disabled={loading} style={buttonStyle}>
        {loading ? "Loading…" : "View moderator report"}
      </button>
      {data !== undefined && (
        <p style={{ marginTop: 8, fontSize: 14 }}>
          Report: <code>{data}</code>
        </p>
      )}
      {error !== undefined && (
        <p style={{ marginTop: 8, color: "var(--rootsdk-error)", fontSize: 14 }}>{error}</p>
      )}
    </div>
  );
};

const Loading: React.FC = () => <div style={pageStyle}>Loading…</div>;

const ErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div style={{ ...pageStyle, color: "var(--rootsdk-error)" }}>
    Failed to load viewer context: {message}
  </div>
);

// Owner takes precedence over moderator deliberately — an owner who's also
// in the moderator role group is shown as "owner". Don't "fix" this to a
// composite label like "owner+moderator"; the label is for at-a-glance
// identity, not a permission audit, and owner is the strictly higher tier.
function labelFor(ctx: ViewerContext): string {
  if (ctx.isOwner) return "owner";
  if (ctx.isModerator) return "moderator";
  return "member";
}

// Inline styles so this recipe doesn't bring a CSS toolchain into scope.
// A real app would lift these into CSS modules. All colors come from Root
// design tokens (`--rootsdk-*` CSS custom properties); the host injects
// them on document.documentElement and updates them automatically when
// the user toggles light/dark theme. Reference:
// docs/llms/app-docs/develop/client/design-system-reference.md
const pageStyle: React.CSSProperties = {
  fontFamily: "system-ui, -apple-system, sans-serif",
  padding: 24,
  maxWidth: 640,
  margin: "0 auto",
  color: "var(--rootsdk-text-primary)",
};

const metaStyle: React.CSSProperties = {
  color: "var(--rootsdk-text-secondary)",
  fontSize: 14,
  marginTop: 8,
};

const sectionStyle: React.CSSProperties = {
  border: "1px solid var(--rootsdk-border)",
  borderRadius: 12,
  padding: 16,
  marginTop: 16,
};

const hintStyle: React.CSSProperties = {
  color: "var(--rootsdk-text-tertiary)",
  fontSize: 13,
  marginTop: 24,
};

const buttonStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid var(--rootsdk-border)",
  background: "var(--rootsdk-highlight-light)",
  color: "var(--rootsdk-text-primary)",
  cursor: "pointer",
  fontSize: 14,
};
