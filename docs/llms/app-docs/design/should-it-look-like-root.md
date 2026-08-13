---
path: app-docs/design/should-it-look-like-root.md
audience: app
category: guide
summary: Does your App have its own brand colors? Or do you want to match Root's colors? Either way works. It's your choice.
---

# Should your App look like Root?

Does your App have its own brand colors? Or do you want to match Root's colors? Either way works. It's your choice. Whatever you decide, your App should support both dark and light themes.

By the end of this article, you'll be able to:

- **Explain** why providing dark and light themes is important
- **Decide** whether to use Root's colors.

## Step 1: Support both dark and light themes

Every Root App should offer a **dark mode** and a **light mode**. Users expect it, and it makes your App easier to use in different environments.

- **Light theme**: Better for bright settings  
- **Dark theme**: Reduces eye strain in low light  

### Why it matters

- **Accessibility**: Helps all users, no matter the time of day or lighting conditions
- **User expectations**: Theme switching is standard now. Supporting it makes your App feel modern and considerate.

### Best practices

- Make sure text, icons, and backgrounds are readable in both themes.
- Test your color contrast to meet accessibility standards.

## Step 2: Handle theme changes in real time

Don't just offer dark and light modes, adapt to changes immediately. If a user switches their system theme, your App should update on the spot.

### Why it matters

- **Seamlessness**: Users expect apps to react instantly when they change system settings.  
- **Better experience**: Adapting smoothly shows polish and keeps your App feeling integrated.

### Best practices

- Use the Root API to detect theme changes.  
- Make sure layouts, images, and elements adjust cleanly.  
- Use smooth transitions to avoid jarring switches.

## Step 3: Should you use Root's colors?

Root provides a full set of CSS colors you can use. Using them makes your App blend visually with the rest of the platform. The Root client keeps those CSS colors up-to-date even when the user changes the theme in the Root client or in their system settings.

### Why it matters

- **Cohesion**: Using Root's colors helps your App feel like part of the larger system.  
- **Familiarity**: Members already know and trust Root's visual style. Matching it makes your App feel natural.

### Best practices

- **Balance**: It's fine to use Root's colors while still showing your own brand identity through logos, accents, or special elements.  
- **Flexibility**: If you have a strong brand look, you can skip Root's colors, just make sure your design stays clear, accessible, and easy to use.

## Conclusion

Theming isn't just decoration: it's part of a great user experience. Support dark and light modes. Respond to theme changes instantly. And choose whether you want to blend into Root's visual style or stand out with your own.