import { rootServer, RootAppStartState } from "@rootsdk/server-app";
import { initializeLifecycleApp, shutdownLifecycleApp } from "./lifecycle-app";

async function onStarting(state: RootAppStartState) {
  // For apps with custom RPC services, call rootServer.lifecycle.addService()
  // here before start() resolves. See llms/templates/app/ for the full pattern
  // including .proto definitions and generated service base classes.
  initializeLifecycleApp(state);
}

async function onStopping() {
  await shutdownLifecycleApp();
}

(async () => {
  await rootServer.lifecycle.start(onStarting, onStopping);
})();
