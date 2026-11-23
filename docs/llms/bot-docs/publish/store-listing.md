---
path: bot-docs/publish/store-listing.md
audience: bot
category: guide
summary: Your store listing is what people see when they find your App or Bot in the Root store: its name, icon, banner, description, screenshots, category...
---

# Store listing

Your store listing is what people see when they find your App or Bot in the Root store: its name, icon, banner, description, screenshots, category and privacy policy.

Edit it on the **Listing** tab of your project in the [Root Developer Portal](https://dev.rootapp.com), then select **Save changes**.

## Fields

| Field | Required to release | Rules |
| ----- | ------------------- | ----- |
| Name | Yes | 4 to 30 characters. No other App or Bot can already use it. |
| Icon | Yes | An image of 5 MB or less, shown as a square. Use 512 by 512 pixels. |
| Banner | Yes | An image of 5 MB or less. Use 2400 by 500 pixels. See [Banner](#banner). |
| Description | Yes | At least 32 characters. Supports bold, italics, bulleted lists and headings in Markdown. A preview appears under the field. |
| Category | Yes | Entertainment, Productivity or Tools. |
| Privacy policy URL | Yes | Starts with `http://` or `https://`. See [Privacy policy](#privacy-policy). |
| Gallery | At least one screenshot | Images, shown at a 16 to 9 ratio in the store. Use 1920 by 1080 pixels. |
| Support community ID | No | The ID of a Root community where people can get help with your App or Bot. |

## Banner

The store crops the banner to fill a different shape in each place. On your App or Bot's page on desktop it is about 4.6 to 1, and on a store card it can be as narrow as about 1.9 to 1. Keep text and logos in the middle 930 pixels of a 2400 by 500 banner so they stay visible everywhere.

## Name

Your name is reserved when you first release. Until then, the name you registered with is kept, even if you change it on the **Listing** tab.

## Release

The **Listing** tab shows anything that is missing under **Before you can release**. To release, you need every required field in the table, and your organization needs to be certified and have permission to release to the store. Contact Root support to get both.

## Privacy policy

The privacy policy URL must open a privacy policy for your App or Bot. People see the link on its page in the store.

The page must:

- open in a browser without signing in. A private Google Doc, or a file that needs an account to view, does not work.
- stay online while your App or Bot is published. If your hosting expires, the link stops working.
- describe your App or Bot: what data it stores, why, who else receives it, how long you keep it, and how a person can ask you to delete it.

These are not a privacy policy:

- Root's privacy policy. It covers Root, not your App or Bot.
- a link to a Root community, a Discord server or a social media profile
- the home page of your website, or a page about something else

A page on GitHub works if the repository is public. For example, a `PRIVACY.md` file, a GitHub Pages site, or a repository whose README is your privacy policy.