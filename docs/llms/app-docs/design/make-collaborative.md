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