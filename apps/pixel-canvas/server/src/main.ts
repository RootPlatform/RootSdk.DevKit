import { rootServer, RootAppStartState } from "@rootsdk/server-app";
import { initializeAdminCheck, onAdminsChanged } from "./adminCheck";
import { initializeCanvasStore } from "./canvasStore";
import { getSettings } from "./appSettingsStore";
import { pixelCanvasService } from "./pixelCanvasService";
import { log, errFields } from "./lib/log";

// ============================================================================
// Startup order matters:
//
//   1. initializeAdminCheck — caches the community owner and binds to the
//      globalSettings.general.admins ReadOnlyMemberGroup.
//   2. getSettings — read appSettings to get the configured canvas size,
//      which initializeCanvasStore needs as the seed dimension on first
//      run (no canvas exists in KV yet).
//   3. initializeCanvasStore — hydrates the canvas blob from KV. On first
//      run, writes an initial empty canvas of the configured size.
//   4. onAdminsChanged hook — wires the public empty AdminsChanged
//      broadcast so demoted/promoted clients re-fetch and pick up their
//      new amIAdmin flag.
//   5. addService — registers the RPC surface. Must be inside onStarting.
//
// No subscriptions to community state events — pixel-canvas doesn't
// listen to messages, channels, or roles. The only event source is the
// globalSettings update for admin changes (handled inside adminCheck).
// ============================================================================

async function onStarting(state: RootAppStartState): Promise<void> {
  await initializeAdminCheck(state);
  const settings = await getSettings();
  await initializeCanvasStore(settings.canvasSize);

  // notifyAdminsChanged routes through safeBroadcast internally, so any
  // broadcast failure is logged there and never re-thrown — no outer
  // catch needed. `void` discards the returned Promise so the
  // synchronous-callback contract of onAdminsChanged is preserved.
  onAdminsChanged(() => {
    void pixelCanvasService.notifyAdminsChanged();
  });

  rootServer.lifecycle.addService(pixelCanvasService);
  log("info", "pixel-canvas service registered; startup complete");
}

(async () => {
  try {
    await rootServer.lifecycle.start(onStarting);
  } catch (err) {
    log("error", "lifecycle.start failed — app did not start", errFields(err));
    throw err;
  }
})();
