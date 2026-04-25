import { rootServer, RootAppStartState } from "@rootsdk/server-app";
import { initializeClients } from "./client-attachment";

async function onStarting(state: RootAppStartState) {
  initializeClients(state);
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
