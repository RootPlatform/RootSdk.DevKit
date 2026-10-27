---
path: app-docs/design/make-collaborative.md
audience: app
category: guide
summary: Collaborative Apps share updates in real time. When one member does something, everyone else sees it right away.
---

# Make your App feel collaborative

Collaborative Apps share updates in real time. When one member does something, everyone else sees it right away. This helps members feel like they're part of a team rather than working alone.

By the end of this article, you'll be able to:

1. **Choose** which member activities to show to others  
2. **Decide** how and when to show those activities for better engagement  

## Step 1: Choose what to broadcast

Broadcasting member activity helps the App feel alive. It keeps everyone aware of what others are doing. Focus on two types of activity:

### New or updated data

When data is added, changed, or deleted, send an update right away. In _SuggestionBox_, for example, when a member submits a new suggestion, send it to everyone so their UI shows the latest list.

Some updates should go only to specific users. In _Poker_, when someone places a bet, you'd only send that update to the other players at that table.

### In-progress actions

So far, we've only talked about sending updates when actions are complete. But showing what someone is doing _while_ they do it adds energy. Think of the typing indicator in a chat app: it shows someone's there.

You can use this idea in other Apps too:

- **Text editor**: Show live cursors or edits with member names
- **Drawing App**: Show who's moving an object in real time
- **Task tracker**: Display text like "Ann is creating a new task..."

These small updates help everyone feel involved.

## How broadcast delivery works

A broadcast reaches every client that is subscribed to the event in the group you send it to, and that includes the member whose own action caused it. Decide for each broadcast whether the member who acted should receive it.

Your generated broadcast method takes the event, the group of clients to send to, and an optional client to leave out:

```ts
this.broadcastCreated(event, "all", client);
```

The third argument removes **one device** from the list rather than one member. If the member who created the suggestion is signed in on both a laptop and a phone, passing their calling client stops the laptop they acted on from receiving the event, and the phone still receives it. Leave the third argument out and the acting device receives the event too.

That distinction decides what your client code can safely do when an event arrives:

| What the event handler does | Safe when the member's own action caused it? |
| --------------------------- | ------------------------------------------- |
| Updates cached or displayed data | Yes. The end state is the same whoever acted, so running it twice changes nothing. |
| Shows something to the member, such as a message, a redirect, a dialog, or moving keyboard focus | No. The member already saw the result of their own action, so this repeats it. |

The second row is the one to design for. A member who deletes a suggestion and gets both "Suggestion deleted" from their own action and "This suggestion was deleted" from the event has seen the same fact reported twice, in a way that reads like a bug. On a second device it is stranger still, because the message arrives on a screen the member is not looking at.

Two things follow. First, pass the calling client to any broadcast whose handler shows something, so the acting device is left out. Second, since that does not cover the member's other devices, a handler that shows something needs to check whether the event describes a change this member just made. [Use a service from the client side](../develop/networking/use-service.md#how-events-from-your-own-actions-work) shows the pattern.

## Step 2: Choose how to show activity

Real-time activity should be easy to notice. You have a few good options:

1. **Live UI updates**  
   - Send real-time updates to all clients  
   - Use a stream of updates for longer tasks  

2. **Activity indicator**  
   - Turn on the App's channel indicator to get attention  
   - Root clears it automatically when a member enters the channel  

3. **Channel messages**  
   - Post a message to a shared channel (only when it really matters)  
   - For example, _Raid Planner_ could post "The raid starts in 30 minutes" in the general channel

## Example: SuggestionBox

_SuggestionBox_ has three main actions: creating, voting on, and deleting suggestions. It doesn't send in-progress updates or post channel messages. Its actions are fast, so there's no need to show activity in the middle. Its GUI handles visibility well without the need for channel messages.

Here's how it handles collaboration:

| Action             | In-progress update? | Broadcast on complete? | Set activity indicator? | Channel message? |
|--------------------|---------------------|--------------------------|--------------------------|-------------------|
| New suggestion     | No ❌ | Yes ✅ | Yes ✅ | No ❌ |
| Vote added         | No ❌ | Yes ✅ | No ❌ | No ❌ |
| Deleted suggestion | No ❌ | Yes ✅ | No ❌ | No ❌ |

## Conclusion

Collaboration isn't just about shared data: it's about shared presence. When members can see each other act in real time, your App feels active and social. Broadcast key updates, show in-progress work when it makes sense, and use clear visual cues to keep everyone connected.