import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeFiles } from "./files";

async function onStarting(state: RootBotStartState) {
  initializeFiles();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
