# Changelog

All notable changes to this module are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/).

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
- Nearest-earlier-minute fallback so the clock never blanks (1432/1440 minutes
  have a direct quote); digital `HH:MM` fallback if a dataset yields nothing.
- Datasets are parsed once and cached in the node helper.
- Basic test suite (`npm test`) covering parsing, coverage, and time-phrase
  highlighting.
