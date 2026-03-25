import React, { useState, useEffect } from "react";
import {
  echoServiceClient,
  EchoServiceClientEvent,
} from "@{project}/gen-client";
import { EchoRequest, EchoResponse, EchoEvent } from "@{project}/gen-shared";

const Echo: React.FC = () => {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");

  // Process when this client initiates: send the request and receive the response
  const send = async (): Promise<void> => {
    const request: EchoRequest = { message: inputText };
    const response: EchoResponse = await echoServiceClient.echo(request);

    setOutputText(response.message);
  };

  // Handle the broadcast event when a different client sends the echo request
  useEffect(() => {
    const onEchoReceived = (event: EchoEvent) => {
      setOutputText(event.message);
    };

    echoServiceClient.on(EchoServiceClientEvent.Created, onEchoReceived);

    return () => {
      echoServiceClient.off(EchoServiceClientEvent.Created, onEchoReceived);
    };
  }, []);

  return (
    <div>
      <input
        type="text"
        placeholder="Enter message..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
      />
      <button onClick={send}>Send</button>
      <div>{outputText}</div>
    </div>
  );
};

export default Echo;
