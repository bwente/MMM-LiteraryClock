# Changelog

All notable changes to this module are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- ESLint configuration, automated checks, Dependabot configuration, code of
  conduct, third-party notices, and a release checklist.
- Explicit README sections for configuration and updates.

### Fixed

- Restored the `LICENSE` file to canonical MIT text so automated license
  detection recognizes it correctly.

## [1.0.0] - Initial release

### Added
- Literary clock: shows a book passage mentioning the current time, every minute.
- Bundled Lora typeface (OFL) and page-like styling; overrides the MagicMirror
  default font.
- Time phrase emphasised via `timeColor` against a dimmed `quoteColor` for
  glanceability.
- Config options: `fontSize`, `maxWidth`, `quoteColor`, `timeColor`,
  `attributionColor`, `updateOnMinute`, `refreshMinutes`, `fadeSpeed`,
  `showAttribution`, `allowNSFW`, `allowUnknown`, `dataFile`.
- `dataFile` option to load alternative datasets (e.g. other languages).
- Multi-instance support: replies are routed by module identifier.
- Digital `HH:MM` fallback for the eight minutes without a direct quotation or
  when the selected safety filters yield no match.
- Datasets are parsed once and cached in the node helper.
- Basic test suite (`npm test`) covering parsing, coverage, and time-phrase
  highlighting.
