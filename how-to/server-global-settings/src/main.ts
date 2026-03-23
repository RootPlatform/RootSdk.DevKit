import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeGlobalSettings } from "./global-settings";

async function onStarting(state: RootBotStartState) {
  initializeGlobalSettings(state);
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
