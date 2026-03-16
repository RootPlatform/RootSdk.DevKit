import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeMemberGroups } from "./member-groups";

async function onStarting(state: RootBotStartState) {
  initializeMemberGroups();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
