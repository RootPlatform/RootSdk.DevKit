import { Client } from "@rootsdk/server-app";
import { EchoRequest, EchoResponse, EchoEvent } from "@{project}/gen-shared";
import { EchoServiceBase } from "@{project}/gen-server";

export class EchoService extends EchoServiceBase {
  async echo(request: EchoRequest, client: Client): Promise<EchoResponse> {
    const reply = "Echo server: " + request.message;

    const event: EchoEvent = { message: reply };
    this.broadcastCreated(event, "all", client);

    const response: EchoResponse = { message: reply };
    return response;
  }
}

export const echoService = new EchoService();
