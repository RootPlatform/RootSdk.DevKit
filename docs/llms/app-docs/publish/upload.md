---
path: app-docs/publish/upload.md
audience: app
category: guide
summary: The `rootsdk upload` command deploys your code to the Root cloud. You must provide the package file path and your upload token.
---

# Upload your code

The `rootsdk upload` command deploys your code to the Root cloud. You must provide the package file path and your upload token.

## Upload token

Generate your upload token in the [Root Developer Portal](https://dev.rootapp.com) under **Settings > Tokens**. It starts with `auth_` and belongs to your developer account. Generating a new one makes the previous one stop working.

The upload token isn't your `DEV_TOKEN`. The `DEV_TOKEN` in your `.env` file only lets the DevHost run your code in your test community, and an upload with it fails with an authentication error.

Anyone with your upload token can upload new versions as you. Keep it out of your project folder.

## Installation

Include the tool in your project by adding the following to your `package.json`:

```json
{
  "devDependencies": {
    "@rootsdk/dev-tools": "*"
  }
}
```

## Usage

```bash
npx rootsdk upload package [options]
```

## Options

| Option                      | Required | Default | Description |
| --------------------------- | -------- | ------- | ----------- |
| `-f, --file <file>`         | **Yes**  | None    | Path to the package file to upload. |
| `-a, --authToken <token>`   | **Yes**  | None    | Your [upload token](#upload-token), including the `auth_` prefix. |

## Versions

Upload reads the version from the `root-manifest.json` packed inside the `.pkg` file, not from the one in your project folder. Each upload needs a version greater than the latest version you've uploaded.

After you change `version` in `root-manifest.json`, build a new package with `npx rootsdk build package` and upload that file. If the upload says your version "is not greater than the latest existing version" and names an older version than the one in your manifest, you're uploading a package built before the change.

## Rejected uploads

Upload checks the package's client bundle, because anyone can download it. If the bundle holds files that must stay private, or a Root token, the upload stops with a message that starts with `Upload rejected:` and names the files. Remove them as described in [Keep secrets out of your client](package.md#keep-secrets-out-of-your-client), build the package again, and upload it with the same version number.

## Examples

```bash
npx rootsdk upload package --file ./rootapp-1-2-3.pkg --authToken auth_...
```

## Next step

Pre-release the version to test it in your staging community, or release it. See [Pre-release and release](release.md).