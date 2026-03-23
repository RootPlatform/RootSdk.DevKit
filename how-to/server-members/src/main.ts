import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeMembers } from "./members";

async function onStarting(state: RootBotStartState) {
  initializeMembers();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
