import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeCommunity } from "./community";

async function onStarting(state: RootBotStartState) {
  initializeCommunity();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
