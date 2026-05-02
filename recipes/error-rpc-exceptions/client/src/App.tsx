// ============================================================================
// Recipe: RPC Exceptions — Client (the lesson)
// Composes: networking-app-services
// ============================================================================
//
// One UI surface, three labelled buttons, three error-handling shapes for
// the same Claim RPC. The shapes are not alternatives to each other —
// they're a vocabulary. Real apps pick one shape per call site based on
// what the error means and what the right response is:
//
//   Shape 1 (single-code if):
//     Use when only one outcome maps to a user-visible response and the
//     others are either prevented by upstream UI validation or not
//     interesting enough to differentiate.
//
//   Shape 2 (multi-code switch):
//     Use when several errors each map to distinct UI affordances —
//     different banner copy, different recovery action, different focus
//     target. The most general shape.
//
//   Shape 3 (single-code if + side-effect):
//     Use when an error implies the client's cached state is stale and
//     the cheapest fix is to refresh — e.g. NAME_ALREADY_CLAIMED reaching
//     a client whose UI still shows "Available" means a broadcast was
//     missed in flight. Restart resyncs everything.
//
// Each handler ignores errors it doesn't match. That's deliberate: the
// recipe shows the shape in isolation. A real app using shape 1 or 3
// would typically add a fallback `else` branch surfacing a generic
// message; shape 2 would add a `default:` case in the switch. Both
// fallbacks are omitted here so each shape stays minimal — see the
// AGENTS.md walkthrough for the production-shape variants.
// ============================================================================

import React, { useEffect, useRef, useState } from "react";
import { rootClient, RootServerException } from "@rootsdk/client-app";
import {
  claimServiceClient,
  ClaimServiceClientEvent,
} from "@errorrpcexceptions/gen-client";
import {
  ClaimError,
  NameClaimedEvent,
} from "@errorrpcexceptions/gen-shared";

interface CurrentClaim {
  name: string;
  claimedBy: string;
}

export const App: React.FC = () => {
  const [claim, setClaim] = useState<CurrentClaim | undefined>(undefined);
  const [inputName, setInputName] = useState("");
  const [banner, setBanner] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  // StrictMode latch — see useEffect below.
  const initialFetchRef = useRef(false);

  const refreshClaim = async (): Promise<void> => {
    try {
      const r = await claimServiceClient.getClaim({});
      setClaim(r.name && r.claimedBy ? { name: r.name, claimedBy: r.claimedBy } : undefined);
    } catch (err) {
      // Initial-load failure is unrecoverable from the client's point of
      // view. Keep the banner generic — this RPC has no typed errors.
      setBanner(err instanceof Error ? err.message : String(err));
    }
  };

  // Initial load + subscribe. The on/off pair runs on every mount/cleanup
  // cycle so React.StrictMode's dev double-mount registers and unregisters
  // the listener cleanly. The fetch is gated by initialFetchRef so it
  // only runs once (StrictMode would otherwise fire it twice in dev).
  useEffect(() => {
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      void refreshClaim();
    }
    const onClaimed = (e: NameClaimedEvent): void => {
      setClaim(e.released ? undefined : { name: e.name, claimedBy: e.claimedBy });
    };
    claimServiceClient.on(ClaimServiceClientEvent.NameClaimed, onClaimed);
    return () => {
      claimServiceClient.off(ClaimServiceClientEvent.NameClaimed, onClaimed);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Shape 1 ─ single-code if ───────────────────────────────────────────
  // Picks NAME_TOO_LONG arbitrarily to demonstrate the single-code pattern.
  // The other two codes fall through unhandled — for NAME_EMPTY the button
  // is disabled when input is blank/whitespace (via canClaim) so it can't
  // fire, and for NAME_ALREADY_CLAIMED the UI just won't update. Picking
  // this shape says "I only care about one error in this code path."
  const handleClaimIfShape = async (): Promise<void> => {
    setBusy(true);
    setBanner(undefined);
    try {
      await claimServiceClient.claim({ name: inputName });
      setInputName("");
    } catch (err) {
      if (err instanceof RootServerException && err.code === ClaimError.NAME_TOO_LONG) {
        setBanner("Names are limited to 32 characters.");
      }
    } finally {
      setBusy(false);
    }
  };

  // ─── Shape 2 ─ multi-code switch ────────────────────────────────────────
  // Handles all three errors with distinct user-facing copy. The most
  // general shape — every error maps to a specific UI response. This is
  // what suggestion-box's `addVote` uses.
  const handleClaimSwitchShape = async (): Promise<void> => {
    setBusy(true);
    setBanner(undefined);
    try {
      await claimServiceClient.claim({ name: inputName });
      setInputName("");
    } catch (err) {
      if (err instanceof RootServerException) {
        switch (err.code) {
          case ClaimError.NAME_EMPTY:
            setBanner("Please type a name before claiming.");
            break;
          case ClaimError.NAME_TOO_LONG:
            setBanner("Names are limited to 32 characters.");
            break;
          case ClaimError.NAME_ALREADY_CLAIMED:
            setBanner("That name is already claimed by someone else.");
            break;
        }
      }
    } finally {
      setBusy(false);
    }
  };

  // ─── Shape 3 ─ single-code if + side-effect ─────────────────────────────
  // Handles only NAME_ALREADY_CLAIMED. The semantics: if the client UI
  // showed "Available" and the server says "claimed," a broadcast was
  // missed in flight; the cheapest correct response is to restart and
  // resync everything. This is what suggestion-box's `deleteSuggestion`
  // does for its NOT_FOUND case.
  const handleClaimSideEffectShape = async (): Promise<void> => {
    setBusy(true);
    setBanner(undefined);
    try {
      await claimServiceClient.claim({ name: inputName });
      setInputName("");
    } catch (err) {
      if (err instanceof RootServerException && err.code === ClaimError.NAME_ALREADY_CLAIMED) {
        // The user will see a brief reload as the client iframe reboots.
        // After restart, the initial getClaim() picks up the authoritative
        // current claim; the UI shows the right state without further
        // intervention.
        rootClient.lifecycle.restart();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRelease = async (): Promise<void> => {
    setBusy(true);
    setBanner(undefined);
    try {
      await claimServiceClient.release({});
    } catch (err) {
      // Release has no typed errors — generic surface.
      setBanner(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  // The trim+length gate prevents empty/whitespace input from reaching the
  // server, so NAME_EMPTY isn't actually fireable from this UI — the server
  // still validates because clients are untrusted, and the harness exercises
  // the case directly via RPC. Shape 2's switch case for NAME_EMPTY is left
  // in deliberately so the recipe shows what the full-coverage shape looks
  // like even when not every branch is reachable through this particular UI.
  const canClaim = !busy && inputName.trim().length > 0;

  return (
    <main style={pageStyle}>
      <h1 style={titleStyle}>RPC Exceptions</h1>
      <p style={metaStyle}>
        One name slot. Each Claim button below uses a different error-handling shape on the same RPC.
      </p>

      <section style={statusBoxStyle}>
        {claim
          ? <span><strong>Claimed:</strong> {claim.name}</span>
          : <span style={{ color: "var(--rootsdk-text-secondary)" }}>Slot is empty.</span>}
      </section>

      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="claim-name">Name to claim</label>
        <input
          id="claim-name"
          type="text"
          value={inputName}
          onChange={(e) => setInputName(e.target.value)}
          disabled={busy}
          placeholder="Type a name…"
          style={inputStyle}
        />
      </div>

      <div style={shapesRowStyle}>
        <button onClick={() => void handleClaimIfShape()} disabled={!canClaim} style={buttonStyle}>
          Claim (shape 1: if)
        </button>
        <button onClick={() => void handleClaimSwitchShape()} disabled={!canClaim} style={buttonStyle}>
          Claim (shape 2: switch)
        </button>
        <button onClick={() => void handleClaimSideEffectShape()} disabled={!canClaim} style={buttonStyle}>
          Claim (shape 3: side-effect)
        </button>
      </div>

      {banner && <p style={errorStyle}>{banner}</p>}

      <div style={releaseRowStyle}>
        <button onClick={() => void handleRelease()} disabled={busy} style={secondaryButtonStyle}>
          Release current claim
        </button>
      </div>
    </main>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
// Inline so this recipe doesn't bring a CSS toolchain into scope. All
// colors come from Root design tokens (`--rootsdk-*` CSS custom properties)
// — the host injects them on document.documentElement and updates on
// theme change. Reference:
// docs/llms/app-docs/develop/client/design-system-reference.md

const pageStyle: React.CSSProperties = {
  fontFamily: "system-ui, -apple-system, sans-serif",
  padding: 24,
  maxWidth: 640,
  margin: "0 auto",
  color: "var(--rootsdk-text-primary)",
};

const titleStyle: React.CSSProperties = {
  fontSize: 24,
  margin: 0,
};

const metaStyle: React.CSSProperties = {
  color: "var(--rootsdk-text-secondary)",
  fontSize: 14,
  marginTop: 8,
};

const statusBoxStyle: React.CSSProperties = {
  marginTop: 20,
  padding: "12px 14px",
  border: "1px solid var(--rootsdk-border)",
  borderRadius: 8,
  background: "var(--rootsdk-input)",
  fontSize: 14,
};

const fieldStyle: React.CSSProperties = {
  marginTop: 20,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 14,
  border: "1px solid var(--rootsdk-border)",
  background: "var(--rootsdk-input)",
  color: "var(--rootsdk-text-primary)",
  borderRadius: 6,
  boxSizing: "border-box",
};

const shapesRowStyle: React.CSSProperties = {
  marginTop: 16,
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid var(--rootsdk-border)",
  background: "var(--rootsdk-highlight-light)",
  color: "var(--rootsdk-text-primary)",
  cursor: "pointer",
  fontSize: 13,
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "transparent",
  color: "var(--rootsdk-text-secondary)",
};

const releaseRowStyle: React.CSSProperties = {
  marginTop: 24,
  paddingTop: 16,
  borderTop: "1px solid var(--rootsdk-border)",
};

const errorStyle: React.CSSProperties = {
  color: "var(--rootsdk-error)",
  fontSize: 14,
  marginTop: 16,
};
