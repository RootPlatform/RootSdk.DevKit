import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeLifecycle, shutdownLifecycle } from "./lifecycle-bot";

async function onStarting(state: RootBotStartState) {
  initializeLifecycle(state);
}

async function onStopping() {
  await shutdownLifecycle();
}

(async () => {
  await rootServer.lifecycle.start(onStarting, onStopping);
})();
