# Auth Pages Light Redesign — Design Spec

## Overview

Retheme the register and login pages from hardcoded dark palettes to the project's design system tokens (`_tokens.scss`). Light theme becomes the default visual. Both pages share the same approach.

## Scope

- `src/routes/register/+page.svelte` — full style block rewrite
- `src/routes/login/+page.svelte` — full style block rewrite
- No structural/HTML changes. No new components. No layout changes.

## Token Mapping

All scoped CSS variables (`--r-*`, `--login-*`) are removed. Direct token references replace them:

| Scoped Variable | Design Token |
|---|---|
| `*-bg` | `--surface-0` |
| `*-surface` | `--surface-1` |
| `*-surface-2` | `--surface-2` |
| `*-border` | `--border-default` |
| `*-border-hover` | `--border-strong` |
| `*-text` | `--text-primary` |
| `*-text-dim` | `--text-secondary` |
| `*-text-muted` | `--text-muted` |
| `*-accent` | `--accent-primary` |
| `*-accent-glow` | `--accent-primary-muted` |
| `*-accent-soft` | `--accent-primary-muted` |
| `*-success` | `--accent-success` |
| `*-success-soft` | `--accent-success-muted` |
| `*-danger` | `--accent-danger` |
| `*-font` | `--font-sans` |
| `*-mono` | `--font-mono` |

## Visual Adjustments

### Background Grid
- Line color: `rgba(99, 102, 241, 0.05)` on `--surface-0` background
- Fade gradient uses `--surface-0` instead of dark background

### Brand Panel
- Divider gradient: `--border-default` to `--accent-primary-muted`
- Brand title: solid `--text-primary` (no gradient)
- Subtitle: `--text-muted`
- Stats card (login): `--accent-primary-muted` background, `--border-subtle` border

### Orb (Login) / Hex Logo (Register)
- Ring borders: `--accent-primary` with 0.3/0.15/0.07 opacity (unchanged ratios)
- Core glow replaced with: `box-shadow: 0 0 20px var(--accent-primary-muted)`
- No neon glow effects

### Form Panel
- Inputs: `--surface-1` background, `--border-default` border
- Focus: `--accent-primary` border, `0 0 0 3px var(--accent-primary-muted)` shadow
- Hover: `--border-strong` border, `--surface-2` background

### Buttons
- Background: `--accent-primary`, hover: `--accent-primary-hover`
- Hover shadow: `--shadow-md` (no glow)
- Disabled: `opacity: 0.5`

### Error State
- Text: `--accent-danger`
- Background: `--accent-danger-muted`
- Border: `--accent-danger` at 0.15 opacity

### Badges
- Register setup badge: `--accent-success` text, `--accent-success-muted` background
- Login auth badge: `--accent-primary` text, `--accent-primary-muted` background

## Typography

Remove Geist font imports. Use design system fonts:
- Sans: `--font-sans` (Inter)
- Mono: `--font-mono` (JetBrains Mono)

Remove `<link>` tags for Google Fonts preconnect/Geist in both pages' `<svelte:head>`.

## Animations Kept

- `gridDrift` — 20s linear infinite translate (lighter grid lines)
- `brandReveal` / `brandIn` — 0.8s ease fade-up entrance
- `formReveal` / `formIn` — 0.6s ease fade-up entrance
- `orbPulse` — 4s ease-in-out scale pulse (login orb)
- `hexSpin` — 12s linear rotate (register logo)
- `errorShake` — 0.4s shake on error
- `spin` — loading spinner

## Animations Removed

None. All animations stay, just with lighter color values.

## Responsive Breakpoints

Unchanged:
- `900px` — stack to column, collapse brand panel
- `480px` — tighter padding, hide stats/descriptions

## Files Changed

1. `src/routes/register/+page.svelte` — style block rewrite, remove Geist `<link>` tags
2. `src/routes/login/+page.svelte` — style block rewrite, remove Geist `<link>` tags
