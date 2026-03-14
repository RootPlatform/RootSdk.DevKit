import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { logInfo } from "./app-logs";

async function onStarting(state: RootBotStartState) {
  await logInfo("App started");
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
