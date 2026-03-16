import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeRoles } from "./roles";

async function onStarting(state: RootBotStartState) {
  initializeRoles();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
