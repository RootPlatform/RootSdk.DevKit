import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeEmojis } from "./emojis";

async function onStarting(state: RootBotStartState) {
  initializeEmojis();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
