---
path: app-docs/design/choose-ui-framework.md
audience: app
category: guide
summary: The client side of a Root App is a regular web app. It runs inside a Chromium-based container and starts by loading your `index.html` file.
---

# Choose your UI framework

The client side of a Root App is a regular web app. It runs inside a Chromium-based container and starts by loading your `index.html` file. That means you can use any web technology—HTML, CSS, JavaScript, TypeScript, or any frontend framework like React.

By the end of this article, you’ll be able to:

- **Understand** what matters when picking a frontend framework  
- **Choose** the right tool based on your team’s experience and your App’s needs  

## How to choose a UI framework

You can use any modern frontend stack, as long as it outputs an `index.html` file.

When choosing, consider:

- **What your team knows** – Stick with tools you're comfortable using. There are no Root-specific restrictions.  
- **Build process** – Your tool should output a self-contained web app with an `index.html` file.  
- **Community and support** – React has the most official Root support, but you're free to use anything.  

## Popular choices

Because Root Apps run in a Chromium browser, most frontend frameworks will work. Here are a few common options:

- **React** – Widely used, great TypeScript support, strong ecosystem, and easy to integrate with Root's event system.  
- **Vue** – A declarative, template-based framework with built-in reactivity.  
- **Svelte** – Compiles to minimal JavaScript, good for fast or lightweight apps.  
- **Lit** – A small library for building Web Components using standard browser APIs.  
- **Plain HTML + JS** – Perfectly valid for simple dashboards or tools that don’t need much interactivity.

## Our recommendation: React

The official Root samples and documentation use **React**, and it’s what we recommend for new projects.

Why React works well:

- It uses a **component-based structure**, which helps you build interactive UIs.  
- **Hooks** make it easy to work with Root’s event-driven APIs.  
- There’s a huge ecosystem for state management, testing, and styling.  
- It has strong **TypeScript support**, which pairs well with Root’s generated types.

## Conclusion

Use **React** if you’re not sure—it’s proven, well-supported, and used in all Root examples. You can choose another framework if it fits your team or project better—just make sure it runs in the browser and doesn’t require special hosting.