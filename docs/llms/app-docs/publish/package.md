---
path: app-docs/publish/package.md
audience: app
category: guide
summary: The `rootsdk build package` command packages your compiled code for distribution. It creates a `.pkg` file based on your `root-manifest.json`.
---

# Package your code

The `rootsdk build package` command packages your compiled code for distribution. It creates a `.pkg` file based on your `root-manifest.json`.

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
npx rootsdk build package [options]
```

## Options

| Option | Required | Default | Description |
| ------ | -------- | ------- | ----------- |
| `-o, --output-file <output-file>` | **No** | `rootapp-<version>.pkg` in the project folder | File name for the generated package. |
| `-p, --project-folder <folder>`   | **No** | `./` (current directory) | Path to the directory containing `root-manifest.json`. |

The default file name uses the manifest version with dots replaced by hyphens: version `1.2.3` gives `rootapp-1-2-3.pkg`. A relative `--output-file` is resolved against the project folder, not the current directory. It must be a file name, not a folder, and any folder in the path must already exist.

## Keep secrets out of your client

Your client bundle, the folder `package.client.deploy` points to, is downloadable by anyone, whether or not they've installed your App. Anything your App needs to keep private belongs in its server code, which Root never sends to clients. A Bot has no client bundle, so leave `package.client` out of a Bot's manifest.

The packager leaves these out of the client bundle and lists what it left out:

- `.env` and `.env.*` files, except `.env.example`, `.env.sample` and `.env.template`
- `.git`, `.ssh` and `.aws` folders, and `.git` files
- `.npmrc`, `.netrc`, `id_rsa` and `id_ed25519`
- the DevHost database, `rootsdk.sqlite3`, and copies of it

It also warns when a client file contains a Root `DEV_TOKEN` or [upload token](upload.md#upload-token). That usually means your client code reads a value from `.env` at build time. Remove it from the client and build again. Upload rejects a package with any of these in its client bundle.

If `package.client.deploy` is your project folder (`"."`), the packager warns, because everything in that folder becomes downloadable. Point it at your built client output instead.

Versions you uploaded earlier stay downloadable, so a secret in one of them is public.

## Examples

Package the current project into a file named `rootapp-<version>.pkg` in the project root:

```bash
npx rootsdk build package
```

Package into a custom file name in an existing `dist` folder:

```bash
npx rootsdk build package --output-file ./dist/custom-name.pkg
```

Package a project where the source is in a different directory. The package is written to `../my-project/rootapp-<version>.pkg`, because the output path is resolved against the project folder:

```bash
npx rootsdk build package --project-folder ../my-project
```