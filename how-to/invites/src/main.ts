import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeInvites } from "./invites";

async function onStarting(state: RootBotStartState) {
  initializeInvites();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
