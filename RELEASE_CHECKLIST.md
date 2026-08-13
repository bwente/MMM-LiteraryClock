# Release checklist

Before publishing a release or submitting a module to the MagicMirror² module
list:

- Run `npm ci`, `npx eslint`, and `npm test`.
- Confirm `LICENSE` contains only the canonical license text and that its SPDX
  identifier matches `package.json`. Keep third-party terms in
  `THIRD_PARTY_NOTICES.md` or their own license files.
- Confirm the README contains install, configuration example, configuration,
  update, testing, screenshot, and license information.
- Confirm `package.json` has the repository, issue tracker, homepage, license,
  keywords, supported Node version, and all runtime dependencies.
- Confirm `CODE_OF_CONDUCT.md`, `.github/dependabot.yml`, and a linter
  configuration are present.
- Check the generated MagicMirror² module report and investigate every warning.
  Do not add unused dependencies to silence false positives.
- Watch the GitHub repository so maintainer notifications are delivered.
