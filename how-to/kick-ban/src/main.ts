import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeKickBan } from "./kick-ban";

async function onStarting(state: RootBotStartState) {
  initializeKickBan();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
