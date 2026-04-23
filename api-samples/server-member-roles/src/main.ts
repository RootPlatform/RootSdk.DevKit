import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeMemberRoles } from "./member-roles";

async function onStarting(state: RootBotStartState) {
  initializeMemberRoles();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
