---
path: bot-docs/design/save-data-early-and-often.md
audience: bot
category: guide
summary: Your Bot automatically gets a SQLite database. Use it to store anything important.
---

# Save data early and often

Your Bot automatically gets a SQLite database. Use it to store anything important. Don't keep data only in memory: if your Bot restarts, that data is gone.

By the end of this article, you'll be able to:

- **Choose** what data your Bot should save  
- **Decide** when to write that data to SQLite  

## Why you need to save data to SQLite

Your Bot can restart at any time. This might happen because Root moves it to a new cloud cluster, or because your code crashes. If Root shuts it down on purpose, you'll get a few seconds' notice. If it crashes, there's no warning.

Root automatically backs up and restores your SQLite database. Anything you write to SQLite will still be there when your Bot comes back online.

## Decide what to store

You'll usually store two kinds of data:

- **Completed work**: For example, if your Bot assigns roles to members, save each role assignment as soon as it happens.
- **In-progress tasks**: Sometimes it's useful to save partial progress. For example, suppose you were coding a polling Bot that allowed the member to create a new poll with several, separate commands. You could save the partially constructed poll after each member command so they wouldn't need to reenter their work. This adds complexity but helps prevent data loss if the Bot shuts down mid-task.

## Decide when to save

You don't control when your Bot shuts down. It could happen without notice. The safest approach is to write important data to SQLite immediately after you receive or create it.

## Conclusion

Saving data early protects you from crashes, restarts, and unexpected shutdowns. If the data matters, save it to SQLite right away. That way, your Bot can pick up where it left off, no surprises, no lost work.