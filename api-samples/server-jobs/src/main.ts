import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeScheduler } from "./scheduler";

async function onStarting(state: RootBotStartState) {
  initializeScheduler();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
