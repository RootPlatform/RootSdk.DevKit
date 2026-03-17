import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeAppLogs, logInfo } from "./app-logs";

async function onStarting(state: RootBotStartState) {
  initializeAppLogs();
  await logInfo("App started");
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
