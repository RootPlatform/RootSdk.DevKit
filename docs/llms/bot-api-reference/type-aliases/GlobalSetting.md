---
path: bot-api-reference/type-aliases/GlobalSetting.md
audience: bot
category: reference
summary: Union type representing any individual setting value. The actual type depends on the setting's type key declared in the manifest.
---

> **GlobalSetting** = [`GlobalSettingText`](GlobalSettingText.md) | [`GlobalSettingNumber`](GlobalSettingNumber.md) | [`GlobalSettingCheckbox`](GlobalSettingCheckbox.md) | [`GlobalSettingRoleOrMember`](GlobalSettingRoleOrMember.md) | [`GlobalSettingChannel`](GlobalSettingChannel.md) | [`GlobalSettingChannelGroup`](GlobalSettingChannelGroup.md) | [`GlobalSettingSelect`](GlobalSettingSelect.md) | [`GlobalSettingTimestamp`](GlobalSettingTimestamp.md) | [`GlobalSettingTime`](GlobalSettingTime.md) | [`GlobalSettingDate`](GlobalSettingDate.md) | [`GlobalSettingColor`](GlobalSettingColor.md)

Union type representing any individual setting value. The actual type depends on the setting's type key declared in the manifest. For example, a `roleAndMember` setting produces a `GlobalSettingRoleOrMember` (`ReadOnlyMemberGroup`), while a `checkbox` produces a `GlobalSettingCheckbox` (`boolean`).

You don't typically work with this union directly. Instead, access settings by group and item key on `rootServer.globalSettings`, where the value is already the concrete type.