import { rootServer, RootAppStartState } from "@rootsdk/server-app";
import { echoService } from "./exampleService"; // TODO: remove this line when you no longer need the example code

async function onStarting(state: RootAppStartState) {
  rootServer.lifecycle.addService(echoService); // TODO: remove this line when you no longer need the example code
}

(async () => {
  await rootServer.lifecycle.start(onStarting);
})();
