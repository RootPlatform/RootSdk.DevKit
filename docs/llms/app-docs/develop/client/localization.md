---
path: app-docs/develop/client/localization.md
audience: app
category: guide
summary: Show your App's text in the language each member uses Root in.
---

# Localization

Show your App's text in the language each member uses Root in.

## Which language to use

The Root SDK has no language API. Your client reads the language from the browser instead:

```ts
const requestedLanguage = navigator.language; // for example "es-419" or "pl"
```

In the Root desktop and mobile apps, `navigator.language` is the language the member chose in Root.

Keep the part before the hyphen, so `pt-BR` becomes `pt` and `es-419` becomes `es`. If you don't support the language, show English.

Root itself is available in English, Spanish, French, Portuguese, German, Italian, Polish, Turkish, Indonesian and Dutch. These are the languages your members are most likely to use.

## What to translate

Translate the text your App writes: labels, buttons, messages, errors and any default content. Show text that members and leaders write exactly as they wrote it.

## Translation files

Keep each language in its own file. Each line is a key and its text, and every file has the same keys:

```ts
export const en: Record<string, string> = {
  "action.like": "Like",
  "likes.lastLiked": "Last like: {time}",
};
```

```ts
export const es: Record<string, string> = {
  "action.like": "Me gusta",
  "likes.lastLiked": "Último me gusta: {time}",
};
```

## Choose the language and translate

```ts
import { en } from "./en";
import { es } from "./es";

const translations: Record<string, Record<string, string>> = { en, es };

function chooseLanguage(): string {
  const languageCode = navigator.language.split("-")[0].toLowerCase();
  return languageCode in translations ? languageCode : "en";
}

export const currentLanguage = chooseLanguage();

document.documentElement.lang = currentLanguage;

export function translate(key: string, values: Record<string, string | number> = {}): string {
  let text = translations[currentLanguage][key] ?? en[key] ?? key;
  for (const [name, value] of Object.entries(values)) {
    text = text.replace(`{${name}}`, String(value));
  }
  return text;
}
```

Setting `document.documentElement.lang` lets screen readers and the browser use the right language too.

Use `translate()` for every piece of text on screen:

```tsx
<button onClick={handleLikeClick}>{translate("action.like")}</button>
```

## Plurals

Languages count differently. English has two forms (1 person, 2 people). Polish has four: 1 *osoba*, 2 *osoby*, 5 *osób*, and a form for fractions. Indonesian has one: *1 orang*, *2 orang*. Add a key for each form, ending in the form's name:

```ts
"likes.count_one": "{count} person liked this",
"likes.count_other": "{count} people liked this",
```

`Intl.PluralRules` tells you which form a count needs:

```ts
const pluralRules = new Intl.PluralRules(currentLanguage);

export function translatePlural(key: string, count: number): string {
  const pluralForm = pluralRules.select(count); // "one", "few", "many" or "other"
  const pluralKey = `${key}_${pluralForm}` in translations[currentLanguage] ? `${key}_${pluralForm}` : `${key}_other`;
  return translate(pluralKey, { count: new Intl.NumberFormat(currentLanguage).format(count) });
}
```

| Language | Forms to provide |
|----------|------------------|
| English, Spanish, French, Portuguese, German, Italian, Turkish, Dutch | `_one`, `_other` |
| Polish | `_one`, `_few`, `_many`, `_other` |
| Indonesian | `_other` |

## Numbers, dates and times

The browser's `Intl` formatters cover every language without a date library:

```ts
new Intl.NumberFormat(currentLanguage).format(1000000);                  // "1.000.000" in Spanish
new Date().toLocaleDateString(currentLanguage, { dateStyle: "medium" }); // "19 paź 2026" in Polish
new Intl.RelativeTimeFormat(currentLanguage, { numeric: "auto" }).format(-3, "minute"); // "hace 3 minutos"
```

## Errors from your server

Your server doesn't know which language the member uses. Throw a [`RootServerException`](../networking/handle-exceptions.md) with an error code, and let the client turn the code into text:

```ts
throw new RootServerException(LikesError.NOTHING_TO_CLEAR, "There are no likes to clear.");
```

```ts
function translateError(error: unknown): string {
  if (error instanceof RootServerException && error.code === LikesError.NOTHING_TO_CLEAR) {
    return translate("error.NOTHING_TO_CLEAR");
  }
  return translate("error.generic");
}
```

## Text your server writes

Some text is written on the server, such as a notification or a channel message. To write it in a member's language, have the client send its language to the server, for example as a field on a request it makes when it starts, and store it with that member. Keep a set of these texts on the server for each language you support.

## Check your translations at build time

A missing key shows English in the middle of a translated screen. A short script that runs before `vite build` can catch it. Have it compare every language file with `en.ts` and fail when a key is missing, a key is unknown, a `{placeholder}` doesn't match, or a Polish `_few` or `_many` form is missing:

```json
"scripts": {
  "build": "npm run check-translations && tsc && vite build",
  "check-translations": "node --experimental-strip-types scripts/check-translations.mjs"
}
```

## Test each language

Read a `lang` parameter from the client's address so you can test a language without changing your settings:

```ts
const languageFromAddress = new URLSearchParams(window.location.search).get("lang");
const requestedLanguage = languageFromAddress ?? navigator.language;
```

Translated text is often longer than English. Check each language at phone width as well as desktop width, and make sure buttons and labels still fit.

## Sample

The [Localization sample](https://github.com/RootPlatform/RootSdk.Samples/tree/main/Apps/Localization) puts all of this together in a small App: translation files for all ten languages, plurals, relative times, a translated server error and the build check.