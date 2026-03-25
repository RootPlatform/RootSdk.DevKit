---
path: app-docs/develop/client/responsive-ui.md
audience: app
category: guide
summary: Root apps are built using modern web technologies like React and TypeScript.
---

# Root responsive design

Root apps are built using modern web technologies like React and TypeScript. To ensure a great user experience, it’s essential that your app is fully responsive — both to the device screen size and to the Root desktop client's unique presentation modes.

While 1080p (1920x1080) is the most common resolution, your App should be tested against a wide range — from 720p (1280x720) to 4K (3840x2160). Use responsive design principles to smoothly adapt your layout.

## Window size API

Use the browser window API to determine current window size and to subscribe to a resize event. 

```ts
const width = window.innerWidth;
const height = window.innerHeight;

window.addEventListener('resize', () => {
  console.log(window.innerWidth, window.innerHeight);
});
```

## Tips for building responsive Root apps

- Use flexbox and CSS grid for layout flexibility  
- Avoid hardcoded widths/heights — use relative units like `rem`, `%`, `vh`, and `vw`  
- Implement media queries to handle layout shifts at key breakpoints  
- Use container queries (where supported) for layout within dynamic parents  
- Test responsiveness using browser dev tools and window resize events  
- Hide or collapse non-critical UI on smaller viewports  
- Ensure accessibility remains intact across all screen sizes