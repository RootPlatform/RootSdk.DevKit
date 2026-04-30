import { rootServer } from "@rootsdk/server-app";
import {
  ContentFilterSettings,
  SpamControlSettings,
  RateLimitSettings,
  GeneralSettings,
  UsernameFilterSettings,
  UrlFilterSettings,
  UrlFilterMode,
  NewMemberGateSettings,
  MentionSpamSettings,
  SpamScope,
} from "@moderation/gen-shared";

// settingsStore — scalar settings live in the key-value store, one JSON
// record per group. Per the DevKit storage convention, flat primitives
// belong in KV; relational/list shapes (custom words, monitored channels,
// audit log) live in SQLite.
//
// One key per settings group (content filter, spam control, rate limit,
// general). Per-field setters use `dataStore.appData.update()` for atomic
// merges so concurrent admin edits to different fields of the same group
// don't stomp each other (same primitive `app-settings-flat-values` recipe
// uses for its partial-update path). Defaults are merged in on every read
// so a future field addition doesn't surface as undefined for older stored
// records.

const KEY_CONTENT_FILTER = "settings/content-filter";
const KEY_SPAM_CONTROL = "settings/spam-control";
const KEY_RATE_LIMIT = "settings/rate-limit";
const KEY_GENERAL = "settings/general";
const KEY_USERNAME_FILTER = "settings/username-filter";
const KEY_URL_FILTER = "settings/url-filter";
const KEY_NEW_MEMBER_GATE = "settings/new-member-gate";
const KEY_MENTION_SPAM = "settings/mention-spam";

export const DEFAULT_CONTENT_FILTER: ContentFilterSettings = {
  enabled: true,
  filterSlurs: true,
  filterProfanity: true,
  filterCustomWords: true,
  warnUsers: false,
};

export const DEFAULT_SPAM_CONTROL: SpamControlSettings = {
  enabled: true,
  threshold: 3,
  windowMinutes: 60,
  scope: SpamScope.PER_CHANNEL,
  warnUsers: false,
};

export const DEFAULT_RATE_LIMIT: RateLimitSettings = {
  enabled: false,
  maxMessages: 10,
  windowSeconds: 10,
};

export const DEFAULT_GENERAL: GeneralSettings = {
  retentionDays: 30,
};

// Off by default — banning members based on nickname is high-impact and
// admins should opt in deliberately. The matchers are shared with the
// content filter, so enabling this without curating the custom word list
// could cause false positives.
export const DEFAULT_USERNAME_FILTER: UsernameFilterSettings = {
  enabled: false,
};

// Off by default. BLOCKLIST mode is the safer initial state when
// admins enable — they curate domains they want blocked rather than
// the platform restricting all traffic to an empty allow list.
// blockRootInvites defaults off so admins consciously opt in to a
// specific moderation policy decision.
export const DEFAULT_URL_FILTER: UrlFilterSettings = {
  enabled: false,
  mode: UrlFilterMode.BLOCKLIST,
  blockRootInvites: false,
  warnUsers: false,
};

// Off by default — gating fresh members has real false-positive cost
// (legitimate new joiners can't post until the threshold passes).
// 5-minute default catches the most aggressive drive-by spam without
// a long-feeling delay for the legitimate case; admins can tune.
export const DEFAULT_NEW_MEMBER_GATE: NewMemberGateSettings = {
  enabled: false,
  minMinutes: 5,
  warnUsers: false,
};

// Off by default. The 10-mention default is generous — legitimate
// "thanks @a @b @c..." rollups stay clean while @everyone-style pile-
// ons still trip the rule. Stateless: each message is judged on its own
// mention count, no per-user windowing.
export const DEFAULT_MENTION_SPAM: MentionSpamSettings = {
  enabled: false,
  maxMentionsPerMessage: 10,
  warnUsers: false,
};

// Single-process coherence only — concurrent admin edits within one
// tick may briefly return the prior value to readers in flight (the
// cache is invalidated on write but a `getX()` started before the
// invalidation completes returns the cached snapshot it already
// captured). Acceptable for Root's one-instance-per-community shape.
let contentCache: ContentFilterSettings | undefined;
let spamCache: SpamControlSettings | undefined;
let rateCache: RateLimitSettings | undefined;
let generalCache: GeneralSettings | undefined;
let usernameFilterCache: UsernameFilterSettings | undefined;
let urlFilterCache: UrlFilterSettings | undefined;
let newMemberGateCache: NewMemberGateSettings | undefined;
let mentionSpamCache: MentionSpamSettings | undefined;

// --- Reads ----------------------------------------------------------------

export async function getContentFilter(): Promise<ContentFilterSettings> {
  if (contentCache) return { ...contentCache };
  const stored = await rootServer.dataStore.appData.get<
    Partial<ContentFilterSettings>
  >(KEY_CONTENT_FILTER);
  contentCache = { ...DEFAULT_CONTENT_FILTER, ...(stored ?? {}) };
  return { ...contentCache };
}

export async function getSpamControl(): Promise<SpamControlSettings> {
  if (spamCache) return { ...spamCache };
  const stored = await rootServer.dataStore.appData.get<
    Partial<SpamControlSettings>
  >(KEY_SPAM_CONTROL);
  spamCache = { ...DEFAULT_SPAM_CONTROL, ...(stored ?? {}) };
  return { ...spamCache };
}

export async function getRateLimit(): Promise<RateLimitSettings> {
  if (rateCache) return { ...rateCache };
  const stored = await rootServer.dataStore.appData.get<
    Partial<RateLimitSettings>
  >(KEY_RATE_LIMIT);
  rateCache = { ...DEFAULT_RATE_LIMIT, ...(stored ?? {}) };
  return { ...rateCache };
}

export async function getGeneral(): Promise<GeneralSettings> {
  if (generalCache) return { ...generalCache };
  const stored = await rootServer.dataStore.appData.get<
    Partial<GeneralSettings>
  >(KEY_GENERAL);
  generalCache = { ...DEFAULT_GENERAL, ...(stored ?? {}) };
  return { ...generalCache };
}

export async function getUsernameFilter(): Promise<UsernameFilterSettings> {
  if (usernameFilterCache) return { ...usernameFilterCache };
  const stored = await rootServer.dataStore.appData.get<
    Partial<UsernameFilterSettings>
  >(KEY_USERNAME_FILTER);
  usernameFilterCache = { ...DEFAULT_USERNAME_FILTER, ...(stored ?? {}) };
  return { ...usernameFilterCache };
}

export async function getUrlFilter(): Promise<UrlFilterSettings> {
  if (urlFilterCache) return { ...urlFilterCache };
  const stored = await rootServer.dataStore.appData.get<
    Partial<UrlFilterSettings>
  >(KEY_URL_FILTER);
  urlFilterCache = { ...DEFAULT_URL_FILTER, ...(stored ?? {}) };
  return { ...urlFilterCache };
}

export async function getNewMemberGate(): Promise<NewMemberGateSettings> {
  if (newMemberGateCache) return { ...newMemberGateCache };
  const stored = await rootServer.dataStore.appData.get<
    Partial<NewMemberGateSettings>
  >(KEY_NEW_MEMBER_GATE);
  newMemberGateCache = { ...DEFAULT_NEW_MEMBER_GATE, ...(stored ?? {}) };
  return { ...newMemberGateCache };
}

export async function getMentionSpam(): Promise<MentionSpamSettings> {
  if (mentionSpamCache) return { ...mentionSpamCache };
  const stored = await rootServer.dataStore.appData.get<
    Partial<MentionSpamSettings>
  >(KEY_MENTION_SPAM);
  mentionSpamCache = { ...DEFAULT_MENTION_SPAM, ...(stored ?? {}) };
  return { ...mentionSpamCache };
}

// --- Per-field atomic setters --------------------------------------------
//
// Each setter uses dataStore.appData.update() so the read-modify-write
// happens atomically inside the KV layer — two concurrent setters serialize
// and each merges into the latest committed state. After the write the
// per-group cache is invalidated; the next read hydrates from KV.

async function updateContentFilter<K extends keyof ContentFilterSettings>(
  field: K,
  value: ContentFilterSettings[K],
): Promise<void> {
  await rootServer.dataStore.appData.update<ContentFilterSettings>(
    KEY_CONTENT_FILTER,
    (current) => ({ ...current, [field]: value }),
    { ...DEFAULT_CONTENT_FILTER },
  );
  contentCache = undefined;
}

export const setContentFilterEnabled = (v: boolean) =>
  updateContentFilter("enabled", v);
export const setFilterSlurs = (v: boolean) =>
  updateContentFilter("filterSlurs", v);
export const setFilterProfanity = (v: boolean) =>
  updateContentFilter("filterProfanity", v);
export const setFilterCustomWords = (v: boolean) =>
  updateContentFilter("filterCustomWords", v);
export const setContentFilterWarnUsers = (v: boolean) =>
  updateContentFilter("warnUsers", v);

async function updateSpam<K extends keyof SpamControlSettings>(
  field: K,
  value: SpamControlSettings[K],
): Promise<void> {
  await rootServer.dataStore.appData.update<SpamControlSettings>(
    KEY_SPAM_CONTROL,
    (current) => ({ ...current, [field]: value }),
    { ...DEFAULT_SPAM_CONTROL },
  );
  spamCache = undefined;
}

export const setSpamEnabled = (v: boolean) => updateSpam("enabled", v);
export const setSpamThreshold = (v: number) => updateSpam("threshold", v);
export const setSpamWindow = (v: number) => updateSpam("windowMinutes", v);
export const setSpamScope = (v: SpamScope) => updateSpam("scope", v);
export const setSpamWarnUsers = (v: boolean) => updateSpam("warnUsers", v);

async function updateRateLimit<K extends keyof RateLimitSettings>(
  field: K,
  value: RateLimitSettings[K],
): Promise<void> {
  await rootServer.dataStore.appData.update<RateLimitSettings>(
    KEY_RATE_LIMIT,
    (current) => ({ ...current, [field]: value }),
    { ...DEFAULT_RATE_LIMIT },
  );
  rateCache = undefined;
}

export const setRateLimitEnabled = (v: boolean) =>
  updateRateLimit("enabled", v);
export const setRateLimitMax = (v: number) => updateRateLimit("maxMessages", v);
export const setRateLimitWindow = (v: number) =>
  updateRateLimit("windowSeconds", v);

async function updateGeneral<K extends keyof GeneralSettings>(
  field: K,
  value: GeneralSettings[K],
): Promise<void> {
  await rootServer.dataStore.appData.update<GeneralSettings>(
    KEY_GENERAL,
    (current) => ({ ...current, [field]: value }),
    { ...DEFAULT_GENERAL },
  );
  generalCache = undefined;
}

export const setRetentionDays = (v: number) =>
  updateGeneral("retentionDays", v);

async function updateUsernameFilter<K extends keyof UsernameFilterSettings>(
  field: K,
  value: UsernameFilterSettings[K],
): Promise<void> {
  await rootServer.dataStore.appData.update<UsernameFilterSettings>(
    KEY_USERNAME_FILTER,
    (current) => ({ ...current, [field]: value }),
    { ...DEFAULT_USERNAME_FILTER },
  );
  usernameFilterCache = undefined;
}

export const setUsernameFilterEnabled = (v: boolean) =>
  updateUsernameFilter("enabled", v);

async function updateUrlFilter<K extends keyof UrlFilterSettings>(
  field: K,
  value: UrlFilterSettings[K],
): Promise<void> {
  await rootServer.dataStore.appData.update<UrlFilterSettings>(
    KEY_URL_FILTER,
    (current) => ({ ...current, [field]: value }),
    { ...DEFAULT_URL_FILTER },
  );
  urlFilterCache = undefined;
}

export const setUrlFilterEnabled = (v: boolean) =>
  updateUrlFilter("enabled", v);
export const setUrlFilterMode = (v: UrlFilterMode) =>
  updateUrlFilter("mode", v);
export const setUrlFilterBlockRootInvites = (v: boolean) =>
  updateUrlFilter("blockRootInvites", v);
export const setUrlFilterWarnUsers = (v: boolean) =>
  updateUrlFilter("warnUsers", v);

async function updateNewMemberGate<K extends keyof NewMemberGateSettings>(
  field: K,
  value: NewMemberGateSettings[K],
): Promise<void> {
  await rootServer.dataStore.appData.update<NewMemberGateSettings>(
    KEY_NEW_MEMBER_GATE,
    (current) => ({ ...current, [field]: value }),
    { ...DEFAULT_NEW_MEMBER_GATE },
  );
  newMemberGateCache = undefined;
}

export const setNewMemberGateEnabled = (v: boolean) =>
  updateNewMemberGate("enabled", v);
export const setNewMemberGateMinMinutes = (v: number) =>
  updateNewMemberGate("minMinutes", v);
export const setNewMemberGateWarnUsers = (v: boolean) =>
  updateNewMemberGate("warnUsers", v);

async function updateMentionSpam<K extends keyof MentionSpamSettings>(
  field: K,
  value: MentionSpamSettings[K],
): Promise<void> {
  await rootServer.dataStore.appData.update<MentionSpamSettings>(
    KEY_MENTION_SPAM,
    (current) => ({ ...current, [field]: value }),
    { ...DEFAULT_MENTION_SPAM },
  );
  mentionSpamCache = undefined;
}

export const setMentionSpamEnabled = (v: boolean) =>
  updateMentionSpam("enabled", v);
export const setMentionSpamMaxMentions = (v: number) =>
  updateMentionSpam("maxMentionsPerMessage", v);
export const setMentionSpamWarnUsers = (v: boolean) =>
  updateMentionSpam("warnUsers", v);
