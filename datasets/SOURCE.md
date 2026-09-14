# Quote catalogue source

The bundled language catalogues are unchanged offline snapshots of:

- Repository: https://github.com/cdmoro/literature-clock
- Commit: `d2bb7d64665053f2dd6d14a03e998bad4f4ca252`
- Imported: 2026-09-14
- Source files: all seven `quotes/quotes.*.csv` files at that revision

SHA-256 checksums:

```text
e3bffafddb54c86a45a174dfa5c61ddb7ac01a9ca2759a8440e85918bb3d79f0  quotes.de-DE.csv
120d1826e1002890e209a540e1860771a797ea6a05bba1246be8dcedd1012350  quotes.en-US.csv
779031d28f83c37d3b0746296891f51568f8a550ae63a3253fd315e866cb711c  quotes.en-GB.csv
567a3deb6c9e9ab2a1f57ddbef4a2f90e04e56dd5dc9eb880b83ae0104340d0e  quotes.es-ES.csv
d332ca3cff5e1c3e79a734824bd00ceaa6750eb4f153e68f42dd79e19be0af36  quotes.fr-FR.csv
df1feedcc0399ca6a1f03b071080ad6bb93d2a74a35f9c5e9d5a007757a371ad  quotes.it-IT.csv
536b95836f32f44aeb1d61998a24677a635ece14c3e8c649a05224e1571d0da4  quotes.pt-PT.csv
```

The module reads these files locally and makes no runtime request to the source
repository. Update them only from a reviewed upstream commit, then update the
commit, import date, checksums, coverage tests, changelog, and documentation.
