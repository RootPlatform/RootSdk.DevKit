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
| `-o, --output-file <output-file>` | **No** | `./rootapp-<manifest.version>.pkg` (dots in version replaced by hyphens) | Output file for the generated package. Example: if `manifest.version` is `1.2.3`, the output is `./rootapp-1-2-3.pkg`. You can override this by specifying a custom file or directory path. |
| `-p, --project-folder <folder>`   | **No** | `./` (current directory) | Path to the directory containing `root-manifest.json`. |
| `--verbose`                       | **No** | (off) | Print step-by-step progress during packaging. Useful when diagnosing a slow build or unexpected package size. |

## Examples

Package the current project into a file named `rootapp-<version>.pkg` in the project root:

```bash
npx rootsdk build package
```

Package into a custom output file:

```bash
npx rootsdk build package --output-file ./dist
```

Package into a custom file name in a custom output file:

```bash
npx rootsdk build package --output-file ./dist/custom-name.pkg
```

Package a project where the source is in a different directory:

```bash
npx rootsdk build package --project-folder ../my-project --output-file ./dist/pkg
```