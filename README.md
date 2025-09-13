# esbuild-license-compliance-plugin

An `esbuild` plugin that checks license compliance of your dependencies during build time.

## Install

```bash
pnpm add -D esbuild-license-compliance-plugin
```

## Usage

```ts
import { build } from "esbuild";
import { licenseCompliancePlugin } from "esbuild-license-compliance-plugin";

await build({
  // ...
  plugins: [
    licenseCompliancePlugin({
      allowed: ["MIT", "Apache-2.0", "BSD-3-Clause"],
      disallowed: ["GPL-3.0-only"],
      ignores: ["@types/*", "dev-only-package"],
    }),
  ],
});
```

## Options

- `allowed` - Array of SPDX license IDs that are allowed
- `disallowed` - Array of SPDX license IDs that are not allowed
- `ignores` - Array of package name patterns to ignore (supports glob patterns)
