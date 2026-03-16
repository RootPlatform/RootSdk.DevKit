import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeVoice } from "./voice";

async function onStarting(state: RootBotStartState) {
  initializeVoice();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
