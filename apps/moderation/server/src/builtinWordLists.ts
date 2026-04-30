// Built-in moderation word lists. These are the lists the platform ships
// with — admins toggle them with the FilterSlurs / FilterProfanity switches
// in settings, but the contents themselves aren't user-editable.
//
// Kept intentionally short: a real deployment would seed these from a
// curated source the platform owns. The placeholders below illustrate the
// shape and let the message handler exercise the matcher without shipping
// any actual hateful content in the public sample.
//
// Matching is performed against the normalized message text (see
// contentFilter.ts → normalize). The lists below are stored already-
// normalized so the matcher does no per-message work to canonicalize them.

export const BUILTIN_SLURS: readonly string[] = Object.freeze([
  "examplesluronedonotuse",
  "examplesluttwodonotuse",
]);

export const BUILTIN_PROFANITY: readonly string[] = Object.freeze([
  "exampleprofanityone",
  "exampleprofanitytwo",
]);
