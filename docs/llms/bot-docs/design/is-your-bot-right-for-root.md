---
path: bot-docs/design/is-your-bot-right-for-root.md
audience: bot
category: guide
summary: Root Bots let you add community features without building a GUI. Bots rely entirely on Root's built-in UI and API for user interaction.
---

# Is Your Bot Right for Root?

Root Bots let you add community features without building a GUI. Bots rely entirely on Root's built-in UI and API for user interaction. This makes them much faster to develop than Apps.

By the end of this article, you'll be able to:
- **Decide** if your Bot idea is a good match for Root.

## Why use a Bot?

* **Faster to build**: With no frontend GUI code, you can focus entirely on server logic and ship faster.
* **Great for prototyping**: Bots let you test ideas quickly and gather feedback from real users before investing in a full App with a GUI.
* **Perfect for backend utilities**: Some use cases like background automation, data processing, or admin tools may not need a custom interface. They can monitor user actions like channel messages for input and write messages, create log files, add reactions, etc. for output.

## When to choose a Bot over an App

Here are some common use cases where Bots shine:

### ✅ Start with a Bot if…

* You're **exploring a new idea** and want to validate it with users first.
* Your feature works fine with **chat messages** built into the Root client.
* You're building a **background service** that watches channels, listens for events, or maintains state.
* You need an **automation tool** that helps admins manage resources like roles, channels, or files.

### 🚫 Build an App if…

* Your idea **depends on a custom GUI**, like a rich form, dashboard, or dynamic layout.
* You want **fine-grained control over the user experience** beyond what Root's built-in UI allows.
* You need to **present complex visuals or workflows** that wouldn't be clear in chat alone.

## Convert to an App later

Bots are a great place to start, and they don't box you in. If your Bot proves valuable and you want more control over the interface, you can always upgrade it to a full App later. You'll keep your backend logic and add a GUI on top.

## Conclusion

Root Bots are a practical way to get your ideas into the hands of users, fast. Whether you're prototyping a new concept or building a behind-the-scenes utility, Bots let you focus on functionality without the overhead of a custom interface. Start simple, iterate quickly, and when the time is right, evolve into a full App with a GUI.