import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeKvStore } from "./kv-store";

async function onStarting(state: RootBotStartState) {
  initializeKvStore();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
