---
path: bot-api-reference/enumerations/CommunityMemberEvent.md
audience: bot
category: reference
summary: Enum providing string constants for community member event names. Use these values when subscribing to events on `CommunityMemberClient`.
---

Enum providing string constants for community member event names. Use these values when subscribing to events on `CommunityMemberClient`.

## Enumeration Members

### CommunityMemberAttach

> **CommunityMemberAttach**: `"communityMember.attach"`

Emitted when a community member becomes present in the community on a device. This happens when:

- **Desktop client:** The user opens the community in a tab (including popout windows). All open tabs are attached simultaneously — switching between tabs does not trigger additional attach/detach events.
- **Mobile client:** The user opens the community (only one community is open at a time).
- **Apps:** The app's host process connects to the community during deployment or dynamic assignment.
- **Reconnection:** When a client reconnects after a connection loss, it re-attaches to all previously open communities.

The event fires each time a device attaches, even if the user is already attached on another device.

### CommunityMemberDetach

> **CommunityMemberDetach**: `"communityMember.detach"`

Emitted when a community member is no longer present in the community on any device. This happens when:

- **Desktop client:** The user closes the community's tab or popout window. Switching away from a tab does not trigger detach.
- **Mobile client:** The user navigates away from the community.
- **Connection loss:** The user's connection drops and they have no remaining devices attached to the community.
- **Leaving or removal:** The user leaves the community, or is kicked/banned.
- **Apps:** The app's host process disconnects or the community is unassigned.

The event is only broadcast once the user has no remaining attached devices in the community — if they have the same community open on two devices and close one, no detach is emitted.

### UserSetProfile

> **UserSetProfile**: `"user.set.profile"`

Emitted when a user updates their username or profile picture.