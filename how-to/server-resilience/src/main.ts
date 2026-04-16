import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeResilience } from "./resilience";

async function onStarting(state: RootBotStartState) {
  initializeResilience();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
