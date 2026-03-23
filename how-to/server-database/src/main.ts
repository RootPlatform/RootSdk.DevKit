import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeDatabase } from "./database";

async function onStarting(state: RootBotStartState) {
  initializeDatabase();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
