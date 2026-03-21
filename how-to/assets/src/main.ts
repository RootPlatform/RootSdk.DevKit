import { rootServer, RootAppStartState } from "@rootsdk/server-app";
import { initializeAssets } from "./assets";

async function onStarting(state: RootAppStartState) {
  initializeAssets();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
