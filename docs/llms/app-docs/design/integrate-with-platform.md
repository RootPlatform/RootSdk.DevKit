---
path: app-docs/design/integrate-with-platform.md
audience: app
category: guide
summary: Your App runs inside Root: it should feel like part of Root. That means using the same tools and patterns the platform uses to interact with...
---

# Integrate with the Root platform

Your App runs inside Root: it should feel like part of Root. That means using the same tools and patterns the platform uses to interact with community members. Use the channel activity indicator to get attention. Show profile pictures and reuse the standard profile popup. The more your App fits into Root's experience, the better it feels for users.

By the end of this article, you'll be able to:

- **Identify** key ways your App can integrate with the Root platform
- **Decide** which integrations your App will support

## Integration points

Here are the most common ways to make your App feel like part of Root:

- Set the activity indicator on your App's channel
- Read or write messages in other community channels
- Display member status and profile pictures
- Use the standard profile popup

Let's walk through each one.

## Activity indicator

Your App's channel has a visual activity indicator. You can set it to let members know something's new. Root clears the indicator automatically when a member enters the App. You can set the indicator for everyone or just certain members.

Use it when:

- **There's something new or important**. In _SuggestionBox_, the App might show the indicator when someone posts a new suggestion, but not for every vote.  
- **You need input from a member**. In _Poker_, if it's someone's turn and they've left the App channel, you could set the indicator as a reminder.

You don't need to set the indicator when your App updates: Root handles that.

## Channel messages

Your App can use the **Community API** (on the server) to send messages to other channels. This doesn't apply to your App's own channel, which has no message area.

Most Apps don't need this. But it can be useful for community-wide announcements:

- _SuggestionBox_ could post a message in #general linking to a winning suggestion.  
- _Poker_ could post in #games when it's looking for one more player.

## Member profile display

If your App shows member info, go beyond just a name. Use Root's tools to display member profiles the same way the platform does.

For example:

- Use profile pictures next to nicknames  
- Show online/offline status using the member status API  

This makes your App feel consistent with the rest of Root.

## Profile popup

Root has a built-in profile popup UI. It shows a member's name, status, profile picture, and a button to send them a message.

You can use this in your App's client code. It's the same popup Root uses, so it matches the user's expectations.

Some ideas:

- In _SuggestionBox_, clicking the author's name or picture could open the popup and let someone message them directly  
- In _Poker_, show avatars that players can click to learn more or chat privately  

## Conclusion

A good Root App doesn't just run on the platform: it blends in. When you use features like the activity indicator, profile pictures, channel messages, and the profile popup, your App feels like a natural part of the community. These small touches build trust and make your App more useful and more welcome.