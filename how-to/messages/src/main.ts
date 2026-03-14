import { rootServer, RootBotStartState } from "@rootsdk/server-bot";
import { initializeSend } from "./send";
import { initializeReactions } from "./reactions";
import { initializePins } from "./pins";
import { initializeMentions } from "./mentions";
import { initializeFlag } from "./flag";

async function onStarting(state: RootBotStartState) {
  initializeSend();
  initializeReactions();
  initializePins();
  initializeMentions();
  initializeFlag();
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
