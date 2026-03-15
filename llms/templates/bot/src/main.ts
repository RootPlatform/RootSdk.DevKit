import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeExample } from "./example"; // TODO: remove this line when you no longer need the example code

async function onStarting(state: RootBotStartState) {
  initializeExample(); // TODO: remove this line when you no longer need the example code
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
