import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeChannels } from "./channels";

async function onStarting(state: RootBotStartState) {
  initializeChannels();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
