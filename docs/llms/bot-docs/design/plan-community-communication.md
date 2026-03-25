---
path: bot-docs/design/plan-community-communication.md
audience: bot
category: guide
summary: Even without a user interface, your Bot needs a clear communication plan. That includes deciding what to say, who to say it to, and how to send it.
---

# Plan your Bot’s communication with the community

Even without a user interface, your Bot needs a clear communication plan. That includes deciding what to say, who to say it to, and how to send it.

By the end of this article, you’ll be able to:

- **Decide what your Bot should communicate**—and what it should stay quiet about  
- **Choose the right channel for each kind of message**  
- **Avoid over-communicating or disrupting the community**  

## Step 1: Decide what needs to be communicated

Start by asking: **What information does the community need from this Bot?**

- Does it take visible action that should be acknowledged?  
- Does it perform background tasks that only admins care about?  
- Does it need to respond to user input?

Not every Bot needs to post in public channels. In fact, many don’t.

## Step 2: Use the appropriate communication type

Root gives you three ways to communicate:

| Method                     | Who sees it             | Use when...                                      |
|----------------------------|-------------------------|--------------------------------------------------|
| **Client-side log file**   | Admins only             | You need to share info with community leaders    |
| **Channel message**        | Visible to members      | The community needs to see the info              |
| **Create new channel**     | Visible to members      | You’re organizing new discussions or topics      |

Think carefully about which type fits each kind of output. If your Bot is mostly doing automation or moderation, the log file may be all you need.

## Step 3: Know your audience

Split your communication by audience:

- **Admins:** Logs about decisions, exceptions, actions taken, or errors
- **Members:** Messages that require action or show meaningful results

Ask yourself for each message: **Does a regular member need to see this?**. If the answer is no, send it to the client-side log.

## Step 4: Don’t overdo it

Even useful messages become noise if you send too many. Some common signs of overcommunication:

- A message every time a minor action happens  
- Repeating the same message for every member  
- Posting updates that nobody needs in real time

Instead, batch messages when possible, or keep quiet unless something changes.

## Examples

**AutoRoleBot**  
This Bot assigns roles based on user activity. There's no reason to announce each role change to the entire community. Instead, it logs each action to the client-side log so admins can review them if needed.  
→ *Use: client-side log only*

**PollBot**  
This Bot runs member polls and tracks votes. Since the whole point is participation, it reads and writes to channel messages so everyone can see and interact.  
→ *Use: channel messages*

## Conclusion

A well-behaved Bot stays useful without being annoying. It doesn’t spam channels. It doesn’t force awkward text input for things that should really have a UI.