---
path: app-api-reference/server/enumerations/WebRtcBackend.md
audience: app
category: reference
summary: Which WebRTC interface a client must use. The backend is an environment-wide
---

Which WebRTC interface a client must use. The backend is an environment-wide
deployment fact (calls are stopped during a cutover, so backends never mix);
clients discover it from WebRtcSessionCreateResponse.backend.

## Generated

from protobuf enum root.WebRtcBackend

## Enumeration Members

### UNSPECIFIED

> **UNSPECIFIED**: `0`

#### Generated

from protobuf enum value: WEB_RTC_BACKEND_UNSPECIFIED = 0;

### V1

> **V1**: `1`

Session/track/SDP negotiation through the WebRtcGrpcService transport RPCs.

#### Generated

from protobuf enum value: WEB_RTC_BACKEND_V1 = 1;

### V2

> **V2**: `2`

Client connects directly to the SFU with the server_url + access_token
returned by SessionCreate; the transport RPCs are not used.

#### Generated

from protobuf enum value: WEB_RTC_BACKEND_V2 = 2;