# SvelteUML

[![CI](https://github.com/Jonathangadeaharder/svelteuml/actions/workflows/pr-gate.yml/badge.svg)](https://github.com/Jonathangadeaharder/svelteuml/actions/workflows/pr-gate.yml)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Jonathangadeaharder_svelteuml&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Jonathangadeaharder_svelteuml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D20-green)](https://nodejs.org/)

Static analysis tool that generates [D2](https://d2lang.com) architecture diagrams from SvelteKit codebases. Uses `svelte2tsx` + `ts-morph` to parse components, stores, routes, props, events, and server endpoints, producing class diagrams, package diagrams, or SVG/PNG output. No runtime required; analyzes source directly.

## Quick Start

```bash
# Install globally
pnpm add -g svelteuml

# Or run without installing
pnpm dlx svelteuml generate ./my-sveltekit-app

# Generate a class diagram (default)
svelteuml generate ./my-sveltekit-app

# Generate to a specific file
svelteuml generate ./my-sveltekit-app -o docs/architecture.d2

# Generate SVG (requires the d2 CLI on PATH)
svelteuml generate ./my-sveltekit-app -f svg -o diagram.svg
```

## CLI Reference

### Subcommands

| Subcommand | Description |
|------------|-------------|
| `generate` | Generate a D2 diagram from a SvelteKit project |
| `watch` | Watch files and regenerate diagram on change |

### Flags

| Flag | Description | Default |
|------|-------------|---------|
| `-o, --output <path>` | Output file path | `diagram.d2` |
| `-f, --format <type>` | Output format: `d2`, `svg`, `png` | `d2` |
| `-d, --diagram <kind>` | Diagram kind: `class`, `package` | `class` |
| `--class-diagram` | Generate a class diagram (default) | `false` |
| `--package-diagram` | Generate a package diagram | `false` |
| `--collapse-members` | Package diagram: show packages only, hide members | `false` |
| `--readme-annotations` | Package diagram: read per-folder `README.md` `@uml.*` tags | `false` |
| `--theme <name>` | Built-in color theme (e.g. `signature`) | none |
| `--grid-columns <n>` | Pack nodes into an n-column grid (compact flat layouts) | none |
| `-e, --exclude [glob...]` | Glob patterns to exclude from discovery | `[]` |
| `--exclude-patterns [glob...]` | Glob patterns to exclude from output diagram | `[]` |
| `--exclude-externals` | Exclude external dependencies (node_modules) | `false` |
| `--max-depth <n>` | Max dependency traversal depth (0 = unlimited) | `0` |
| `--hide-type-deps` | Hide TypeScript type dependencies | `false` |
| `--hide-state-deps` | Hide Svelte store/state dependencies | `false` |
| `--focus <name>` | Focus on a specific node and its neighbourhood | none |
| `--layout-direction <dir>` | Layout direction | `top-to-bottom` |
| `--detect-circular` | Detect and report circular dependencies | `false` |
| `--fail-on-circular` | Exit with error code on circular deps | `false` |
| `--alias-group <value>` | Group symbols by glob pattern into named package (repeatable, format: `PATTERN:NAME`) | `[]` |
| `--disable-colors` | Disable stereotype color theming | `false` |
| `-q, --quiet` | Suppress all output | `false` |
| `--verbose` | Show verbose output | `false` |

### Layout Directions

- `top-to-bottom` (default)
- `left-to-right`
- `bottom-to-top`
- `right-to-left`

### Examples

```bash
# Generate with max depth 2
svelteuml generate ./my-app --max-depth 2

# Focus on a single component
svelteuml generate ./my-app --focus Button

# Package diagram
svelteuml generate ./my-app --package-diagram -o packages.d2

# Package diagram enriched from folder README.md files
svelteuml generate ./my-app --package-diagram --readme-annotations

# Watch mode
svelteuml watch ./my-app

# Detect circular dependencies
svelteuml generate ./my-app --detect-circular

# Fail build on circular deps
svelteuml generate ./my-app --detect-circular --fail-on-circular

# Exclude test files and generated code
svelteuml generate ./my-app -e "**/*.test.ts" -e "**/__generated__/**"

# Exclude patterns from the output diagram
svelteuml generate ./my-app --exclude-patterns "**/node_modules/**"

# Left-to-right layout with no colors
svelteuml generate ./my-app --layout-direction left-to-right --disable-colors

# Emit D2 source to stdout (pipe to the d2 CLI)
svelteuml generate ./my-app | d2 - diagram.svg
```

## Features

### Class Diagrams

Default diagram type. Shows classes, interfaces, stores, routes, components, and functions as D2 `shape: class` nodes with stereotypes and members.

```bash
svelteuml generate ./my-app
```

Classes rendered with visibility (`+`, `-`, `#`), properties, methods, and type parameters. Stores show `storeType` and `valueType`. Routes show path segments, params, and groups.

### Package Diagrams

Group symbols by their filesystem path into D2 container nodes. Shows high-level module structure, optionally without individual members (`--collapse-members`).

```bash
svelteuml generate ./my-app --package-diagram
```

### Folder README annotations

With `--readme-annotations`, each package looks for `<dir>/README.md` and reads HTML-comment tags to enrich its node:

| Tag | Effect |
|-----|--------|
| `<!-- @uml.title: Video Domain -->` | Override the package label |
| `<!-- @uml.description: Owns video rows -->` | Set a D2 tooltip on the package node |
| `<!-- @uml.hide -->` | Exclude the package (and its edges) entirely |

```bash
svelteuml generate ./my-app --package-diagram --readme-annotations
```

### Naming-pattern stereotypes

A file's name suffix infers a stereotype, applied in both class and package diagrams so domain diagrams read semantically:

| Suffix | Stereotype |
|--------|------------|
| `*.repo.ts`, `*.repository.ts` | `repository` |
| `*.service.ts` | `service` |
| `*.store.ts` | `store` |
| `*.guard.ts` | `guard` |

The `signature` theme colors these stereotypes; `--disable-colors` turns theming off.

### Component Edges

Detects Svelte component imports and draws `->` arrows from parent to child component.

### Store Subscription Edges

Detects `$storeName` auto-subscription in `.svelte` files (the Svelte `$` prefix syntax). Draws dashed `->` edges from component to store file labeled with the store name.

```bash
svelteuml generate ./my-app --hide-state-deps  # hide store edges
```

### Server Load Edges

Tracks data flow from `+page.server.ts` / `+layout.server.ts` to the corresponding `.svelte` page. Detects `$page.data` and `$page.url` usage to draw dashed `->` edges.

### Slot Edges

Tracks `<slot>` and `<slot name="...">` usage. Draws dashed `->` edges labeled `slot:<name>` from child component back to parent.

### Prop Flow Edges

Tracks prop passing from parent to child. Draws `->` edges with prop type signatures.

```d2
ParentForm -> Button: "onClick: (e: Event) => void"
```

### Event Edges

Tracks `createEventDispatcher` usage. Draws dashed `->` edges from child to parent labeled with event names.

### Circular Dependency Detection

Detect cycles in your dependency graph. Reports each cycle's file chain.

```bash
svelteuml generate ./my-app --detect-circular
# Circular dependency: src/lib/stores/auth.ts -> src/lib/utils/api.ts -> src/lib/stores/auth.ts
```

With `--fail-on-circular`, exits with code 1 (useful for CI gates).

### Alias Grouping

Respects SvelteKit path aliases (`$lib`, `$components`, custom). Components under an alias are grouped into a D2 container node with the alias name. Configurable via `aliasOverrides`.

### Config File Support

Supports five config file formats (searched in order):

| File | Format |
|------|--------|
| `svelteuml.config.ts` | TypeScript module |
| `svelteuml.config.js` | JavaScript module |
| `svelteuml.config.mjs` | JavaScript ESM module |
| `.svelteumlrc.json` | JSON |
| `.svelteumlrc` | JSON (no extension) |

CLI flags override config file values.

### Comments DSL (`@uml.*` tags)

Annotate Svelte components with HTML comments to control diagram behavior:

```svelte
<!-- @uml.hide -->
<script>...</script>
```

| Tag | Description |
|-----|-------------|
| `@uml.hide` | Exclude component from diagram output |
| `@uml.group("name")` | Group component into named package |
| `@uml.color("color")` | Custom stereotype color (CSS name or hex) |
| `@uml.focus` | Mark component as a focus node |

## Output Formats

| Format | Extension | Requires | Description |
|--------|-----------|----------|-------------|
| `d2` | `.d2` | Nothing | Raw D2 DSL text |
| `svg` | `.svg` | `d2` CLI on PATH | Vector graphic |
| `png` | `.png` | `d2` CLI on PATH | Raster graphic |

```bash
# SVG output
svelteuml generate ./my-app -f svg -o diagram.svg

# PNG output
svelteuml generate ./my-app -f png -o diagram.png

# D2 source to stdout (pipe to other tools)
svelteuml generate ./my-app > diagram.d2
```

## Configuration Reference

Create `.svelteumlrc.json` in your project root:

```json
{
  "targetDir": "./src",
  "outputPath": "docs/architecture.d2",
  "exclude": ["**/*.test.ts", "**/*.spec.ts"],
  "include": [],
  "maxDepth": 3,
  "excludeExternals": true,
  "aliasOverrides": {
    "$components": "./src/components",
    "$utils": "./src/lib/utils"
  },
  "groups": [
    { "pattern": "src/components/**", "name": "Components" },
    { "pattern": "src/lib/stores/**", "name": "Stores" }
  ]
}
```

### Schema

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `targetDir` | `string` | `process.cwd()` | Path to SvelteKit project root |
| `outputPath` | `string` | `"diagram.d2"` | Output file path |
| `exclude` | `string[]` | `[]` | Glob patterns to exclude from discovery |
| `include` | `string[]` | `[]` | Additional glob patterns to include |
| `maxDepth` | `number` | `0` | Max dependency traversal depth (0 = unlimited) |
| `excludeExternals` | `boolean` | `false` | Truncate at node_modules boundaries |
| `aliasOverrides` | `Record<string, string>` | `{}` | Custom path alias overrides |
| `groups` | `Array<{pattern: string, name: string}>` | `[]` | Group definitions for organizing symbols by file path pattern |

CLI flags always override config file values.

## Demo Gallery

### Class Diagram

Generated from a SvelteKit project: shows components, stores, routes, functions, and their relationships:

![Sample Class Diagram](docs/sample-class.svg)

*D2 source: [docs/sample-class.d2](docs/sample-class.d2)*

### Package Diagram

High-level module structure grouped by filesystem path:

![Sample Package Diagram](docs/sample-package.svg)

*D2 source: [docs/sample-package.d2](docs/sample-package.d2)*

Generate your own:

```bash
pnpm dlx svelteuml generate ./my-sveltekit-app -d class -o diagram.d2
pnpm dlx svelteuml generate ./my-sveltekit-app -d package -o packages.d2
```

## Example Output

```d2
# Diagram
auth: {
  shape: class
  label: "auth"
  class: [store; Exported]
  "storeType": "writable"
  "valueType": "User"
}
Button: {
  shape: class
  label: "Button"
  class: [component]
  "+ label": "string"
  "+ disabled?": "boolean"
}

Button -> auth: "store" { style.stroke-dash: 3 }
```

## Architecture

SvelteUML uses a 5-phase pipeline:

```text
┌─────────────┐    ┌───────────┐    ┌─────────────┐    ┌────────────┐    ┌───────────┐
│  Discovery  │───>│  Parsing  │───>│  Extraction │───>│ Resolution │───>│ Emission  │
│             │    │           │    │             │    │            │    │           │
│ Find files  │    │ svelte2tsx│    │  Symbols    │    │  Edges     │    │ D2 DSL    │
│ Load config │    │ ts-morph  │    │  Props      │    │  Imports   │    │  DSL      │
│ Aliases     │    │ VFS       │    │  Routes     │    │  Reactive  │    │  SVG/PNG  │
└─────────────┘    └───────────┘    └─────────────┘    └────────────┘    └───────────┘
```

1. **Discovery** : Recursively find `.svelte`, `.ts`, `.js` files. Load `svelte.config.js` and `.svelte-kit/tsconfig.json` for path aliases.
2. **Parsing** : Transform `.svelte` SFCs to TSX via `svelte2tsx`. Build a `ts-morph` Project with virtual file system.
3. **Extraction** : Extract components, props, stores, routes, server endpoints, lib functions, classes, events.
4. **Resolution** : Scan imports, build dependency edges (composition, inheritance, type, store, server-load, prop-flow, slot, event). Track reactive `$state`/`$derived` cross-file references.
5. **Emission** : Generate D2 DSL with container nodes, stereotypes, relationship arrows. Optionally render to SVG/PNG via the `d2` CLI.

## Development

| Command | Description |
|---------|-------------|
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm dev` | Watch mode compilation |
| `pnpm test` | Run unit tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm test:integration` | Run integration tests |
| `pnpm test:mutation` | Run Stryker mutation tests |
| `pnpm run typecheck` | Type-check without emitting |
| `pnpm run lint` | Lint with Biome |
| `pnpm run format` | Format with Biome |

### Property-Based Testing

Uses [fast-check](https://github.com/dubzzz/fast-check) alongside unit tests.

| Convention | Standard |
|---|---|
| Generator naming | Prefix with `arb` (e.g. `arbEdge`, `arbEdgeType`) |
| File naming | `*.property.test.ts` |
| Local runs | 100 cases (`VITEST_PBT_NUM_RUNS=100`) |
| CI runs | 100 cases (`VITEST_PBT_NUM_RUNS=100`) |
| Extraction PBTs | capped at 30 internally |

### Contributing

1. Clone: `git clone https://github.com/Jonathangadeaharder/svelteuml.git`
2. Install: `pnpm install`
3. Branch: `git checkout -b feature/my-feature`
4. Check: `pnpm test && pnpm run typecheck && pnpm run lint`
5. PR: Submit a pull request

## License

MIT
