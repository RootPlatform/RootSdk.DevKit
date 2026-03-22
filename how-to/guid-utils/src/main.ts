import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeGuidUtils } from "./guid-utils";

async function onStarting(state: RootBotStartState) {
  initializeGuidUtils();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
