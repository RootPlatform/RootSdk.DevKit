# rootsdk build package

Package compiled code into a `.pkg` file for deployment to the Root cloud.

## Syntax

```bash
rootsdk build package [options]
```

## Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--output-file` | `-o` | `./rootapp-<version>.pkg` | Output file path. Dots in the manifest version are replaced by hyphens (e.g., version `1.2.3` produces `rootapp-1-2-3.pkg`). Can be a custom file path or directory. |
| `--project-folder` | `-p` | `./` (current directory) | Path to the directory containing `root-manifest.json` |

## Prerequisites

- `@rootsdk/dev-tools` in `devDependencies`
- Compiled project — run your full build (`npm run build`) first
- A valid `root-manifest.json` in the project folder

## Examples

Package with default output name:

```bash
rootsdk build package
```

Package to a custom directory:

```bash
rootsdk build package --output-file ./dist
```

Package with a custom file name:

```bash
rootsdk build package --output-file ./dist/custom-name.pkg
```

Package from a different project directory:

```bash
rootsdk build package --project-folder ../my-project --output-file ./dist/pkg
```

## Output

Creates a `.pkg` file containing the compiled code, manifest, and assets. This file is the input to `rootsdk upload package`.
