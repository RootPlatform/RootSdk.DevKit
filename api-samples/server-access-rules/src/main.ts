import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeAccessRules } from "./access-rules";

async function onStarting(state: RootBotStartState) {
  initializeAccessRules();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
