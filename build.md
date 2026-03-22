# DevKit Build Notes

Steps to update DevKit from internal sources. Will become a script eventually.

## Templates

Copy from `RootApp.AppSdk/sdk/templates/create-root/`:
- `template-bot/` → `llms/templates/bot/`
- `template-app/` → `llms/templates/app/`

## Docs

Copy LLM-friendly docs from `Docs.Developer/dist/` → `llms/docs/`
(Not yet implemented — docs build pipeline TBD)

## Schemas

Copy from `Docs.Developer/content/api-supplements/`:
- `api-method-permissions.json` → `llms/schemas/permissions-map.json`
(Not yet implemented — schema pipeline TBD)
