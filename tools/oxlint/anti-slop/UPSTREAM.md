# anti-slop (vendored Oxlint plugin)

Installed from the local `install-anti-slop` opencode skill.

- Installed by: `install-anti-slop` skill, `scripts/install.mjs`
- Local enhancement policy lives in `rules/`, plus the vendored
  `vendor/eslint-stylistic/` copy (see its own `UPSTREAM.md` for that rule).
- Source identity of the generic anti-slop rules: **unknown** (copied at
  install time from the local skill asset tree; no upstream repository/commit
  revision was carried in the asset). Vendor-stylistic provenance is recorded
  separately in `vendor/eslint-stylistic/UPSTREAM.md`.

## Installed paths

- `index.ts` – plugin entry point (registered as `anti-slop`)
- `rules/` – generic rules
- `shared/` – shared rule helpers
- `vendor/eslint-stylistic/` – vendored padding-line rule for `require-readable-spacing`
- `effect/` – opt-in Effect plugin (not enabled in this repository)

## Deviations

- None known; configured via `oxlint.config.ts` in the repository root.