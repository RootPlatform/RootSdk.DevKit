import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeChannelGroups } from "./channel-groups";

async function onStarting(state: RootBotStartState) {
  initializeChannelGroups();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
