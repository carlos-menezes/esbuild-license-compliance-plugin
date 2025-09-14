# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0]

### Added

- `options.dependencies` to specify which dependencies to check for license compliance. By default, all dependencies are checked.

```ts
licenseCompliancePlugin({
    disallowed: ["Apache-2.0"],
    dependencies: ["devDependencies"], // New option to specify which dependencies to check
}),
```
