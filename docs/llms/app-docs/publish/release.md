---
path: app-docs/publish/release.md
audience: app
category: guide
summary: After you upload a package, it appears as a new version on the **Versions** tab of your project in the Root Developer Portal.
---

# Pre-release and release

After you [upload](upload.md) a package, it appears as a new version on the **Versions** tab of your project in the [Root Developer Portal](https://dev.rootapp.com). From there you choose what happens to it.

## Version status

| Status | Meaning |
| ------ | ------- |
| Draft | Uploaded. Nobody can install it. |
| Pre-release | Listed in the App Store of your staging community, so you can test it in Root. |
| Released | Listed in the public App Store. Communities that have your App or Bot installed are updated to it. |
| Deprecated | No longer offered. |

A Draft can go to Pre-release or straight to Released. A Pre-release can go to Released or Deprecated. A Released version can only go to Deprecated.

Only one version is in Pre-release at a time. When you pre-release a new version, the earlier pre-release becomes Deprecated. When you release a version, every older version becomes Deprecated.

## Your staging community

Your staging community is a community on Root for testing your Apps and Bots. Its name is your organization name with `-Staging` at the end, and it is not listed in Discover.

- Root creates it the first time you pre-release a version. Your organization must be certified first. If it is not, the pre-release is saved but no staging community is created.
- Your App or Bot is not installed in it automatically. Open the staging community in Root, open its App Store and install it yourself.
- Its App Store lists only your organization's Apps and Bots that have a version in Pre-release. A version that is Draft or Released does not appear there.

## Test a version

1. Upload the new version.
1. On the **Versions** tab, select **Publish pre-release** for that version.
1. Open your staging community in Root and install your App or Bot from its App Store. You only need to do this once.

When you pre-release a later version, Root updates the install in your staging community to it. If your staging community still runs the old version, remove your App or Bot from the staging community and install it again.

## Release a version

Select **Release** for the version, on the **Versions** tab or the **Listing** tab. To release, your organization must be certified and have permission to release, and your [store listing](store-listing.md) must be complete. The **Listing** tab shows anything that is missing.

## How installed communities get a new version

When you release a new version, every community that has your App or Bot installed gets it:

- Community leaders see **Update available** and can update straight away.
- Communities that do not update are updated automatically 24 hours after the release.

If you release another version within those 24 hours, the automatic update moves to 24 hours after the newer release.

## Remove a version from the store

Select **Deprecate** for the released version. Your App or Bot leaves the public App Store until you release a new version.