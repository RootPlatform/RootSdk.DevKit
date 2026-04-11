---
path: bot-api-reference/type-aliases/ChannelWebRtcEvents.md
audience: bot
category: reference
summary: Event map type for `ChannelWebRtcClient`. This type defines the event signatures for voice channel-related events.
---

> **ChannelWebRtcEvents** = `object`

Event map type for `ChannelWebRtcClient`. This type defines the event signatures for voice channel-related events.

For event name constants, see `ChannelWebRtcEvent`.

## Properties

### channelWebRtcUser.attach()

> **channelWebRtcUser.attach**: (`evt`: [`ChannelWebRtcUserAttachEvent`](ChannelWebRtcUserAttachEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelWebRtcUserAttachEvent`](ChannelWebRtcUserAttachEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelWebRtcEvent, ChannelWebRtcUserAttachEvent } from "@rootsdk/server-bot";
rootServer.community.channelWebRtcs.on(ChannelWebRtcEvent.ChannelWebRtcUserAttach, (evt: ChannelWebRtcUserAttachEvent) => {
  // ...
});
```

### channelWebRtcUser.detach()

> **channelWebRtcUser.detach**: (`evt`: [`ChannelWebRtcUserDetachEvent`](ChannelWebRtcUserDetachEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelWebRtcUserDetachEvent`](ChannelWebRtcUserDetachEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelWebRtcEvent, ChannelWebRtcUserDetachEvent } from "@rootsdk/server-bot";
rootServer.community.channelWebRtcs.on(ChannelWebRtcEvent.ChannelWebRtcUserDetach, (evt: ChannelWebRtcUserDetachEvent) => {
  // ...
});
```

### channelWebRtcUserDevice.set.dataChannel()

> **channelWebRtcUserDevice.set.dataChannel**: (`evt`: [`ChannelWebRtcUserDeviceSetDataChannelEvent`](ChannelWebRtcUserDeviceSetDataChannelEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelWebRtcUserDeviceSetDataChannelEvent`](ChannelWebRtcUserDeviceSetDataChannelEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelWebRtcEvent, ChannelWebRtcUserDeviceSetDataChannelEvent } from "@rootsdk/server-bot";
rootServer.community.channelWebRtcs.on(ChannelWebRtcEvent.ChannelWebRtcUserDeviceSetDataChannel, (evt: ChannelWebRtcUserDeviceSetDataChannelEvent) => {
  // ...
});
```

### channelWebRtcUserDevice.set.status()

> **channelWebRtcUserDevice.set.status**: (`evt`: [`ChannelWebRtcUserDeviceSetStatusEvent`](ChannelWebRtcUserDeviceSetStatusEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelWebRtcUserDeviceSetStatusEvent`](ChannelWebRtcUserDeviceSetStatusEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelWebRtcEvent, ChannelWebRtcUserDeviceSetStatusEvent } from "@rootsdk/server-bot";
rootServer.community.channelWebRtcs.on(ChannelWebRtcEvent.ChannelWebRtcUserDeviceSetStatus, (evt: ChannelWebRtcUserDeviceSetStatusEvent) => {
  // ...
});
```

### channelWebRtcUserDevice.set.transport()

> **channelWebRtcUserDevice.set.transport**: (`evt`: [`ChannelWebRtcUserDeviceSetTransportEvent`](ChannelWebRtcUserDeviceSetTransportEvent.md)) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `evt` | [`ChannelWebRtcUserDeviceSetTransportEvent`](ChannelWebRtcUserDeviceSetTransportEvent.md) |

#### Returns

`void`

#### Example

```typescript
import { rootServer, ChannelWebRtcEvent, ChannelWebRtcUserDeviceSetTransportEvent } from "@rootsdk/server-bot";
rootServer.community.channelWebRtcs.on(ChannelWebRtcEvent.ChannelWebRtcUserDeviceSetTransport, (evt: ChannelWebRtcUserDeviceSetTransportEvent) => {
  // ...
});
```