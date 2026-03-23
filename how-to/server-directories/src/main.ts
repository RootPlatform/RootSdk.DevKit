import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeDirectories } from "./directories";

async function onStarting(state: RootBotStartState) {
  initializeDirectories();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
