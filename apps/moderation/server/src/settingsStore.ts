import { rootServer } from "@rootsdk/server-app";
import {
  ContentFilterSettings,
  SpamControlSettings,
  RateLimitSettings,
  GeneralSettings,
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

let contentCache: ContentFilterSettings | undefined;
let spamCache: SpamControlSettings | undefined;
let rateCache: RateLimitSettings | undefined;
let generalCache: GeneralSettings | undefined;

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
