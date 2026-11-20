# GIS Sentry — Design System

**Status:** R8 live at https://gis-sentry.vercel.app (light foundation, map-first shell, 44px primitives, readable map, grounded copilot, responsive reports, QA).
**Authority:** `PRODUCT.md` for product truth, `.agents/skills/impeccable/` for craft rules.
**Direction:** field notebook / planning desk — paper, ink, one forest accent.

---

## 1. Principles

1. **Decision first.** Every surface points to a shortlist or a memo. The map supports the decision; it is not the product.
2. **Paper, not dashboard.** Warm paper canvas, white surfaces, 1px ink-toned rules. No glass, glow, gradients, or floating cards.
3. **One accent.** Forest green marks action, selection, and high scores. Other colors only carry status (warn, danger, info).
4. **Data is typographic.** Scores, distances, coordinates, and table values use IBM Plex Mono with tabular numerals. Labels use IBM Plex Sans.
5. **Calm density.** Information may be dense, but hierarchy comes from size, weight, and spacing — not from color noise.
6. **Limits are visible.** Percentile scores are labeled as percentiles, placeholder risk is named, and AI answers carry sources.

---

## 2. Colors

Defined once in `app/tokens.css`.

| Token | Value | Use |
|---|---|---|
| `--canvas` | `#F5F2EA` | Page background (warm paper) |
| `--canvas-2` | `#EEEADF` | Map fallback / recessed page area |
| `--surface` | `#FFFFFF` | Panels, memo sheet, tables |
| `--surface-2` | `#F7F4EC` | Sidebar, table headers, quiet cards |
| `--surface-3` | `#EBE6DA` | Tracks, rank chips, inset fills |
| `--ink` | `#1B211C` | Primary text, selected-cell outline |
| `--ink-soft` | `#3E4740` | Body text on cards |
| `--muted` | `#626C64` | Secondary text (AA on canvas and tints) |
| `--muted-2` | `#666F67` | Micro text (AA on canvas and white) |
| `--line` | `#DAD5C8` | 1px borders and dividers |
| `--line-strong` | `#C6BFB0` | Hover borders, scrollbar thumb |
| `--accent` | `#1F6B4F` | Primary action, selection, high score |
| `--accent-hover` | `#18553F` | Hover/pressed action |
| `--accent-soft` | `#E4EEE8` | Selection and success tint |
| `--accent-ink` | `#0F3D2C` | Text on accent tint |
| `--accent-line` | `#C9DED2` | Border on accent tint |
| `--warn` | `#8A5A12` | Medium score, caution |
| `--warn-soft` | `#F5EAD8` | Caution tint |
| `--warn-line` | `#E4C9A6` | Border on caution tint |
| `--danger` | `#A13B32` | Low score, error |
| `--danger-soft` | `#F6E3E0` | Error tint |
| `--danger-line` | `#E8C4BF` | Border on error tint |
| `--info` | `#315E7A` | Neutral / ML reference |
| `--info-soft` | `#E5EDF2` | Info tint |
| `--on-accent` | `#FFFFFF` | Text and icons on forest fill |

**H3 score ramp (flat, sequential):** `#EDE9DD → #D8E5DC → #A9C8B7 → #5D9A7B → #1F6B4F`.

The ramp encodes percentile only. It never implies revenue or probability. Selected H3 cells use a 2px `--ink` outline, not a glow.

Contrast (computed): ink/canvas 14.65:1; muted/canvas 4.88:1; muted-2/canvas 4.65:1; accent/white 6.41:1; warn/warn-soft 4.97:1; danger/danger-soft 5.33:1; accent-ink/accent-soft 10.26:1.

---

## 3. Typography

Self-hosted through Fontsource; no runtime Google Fonts request.

| Role | Family | Size / line-height | Weight |
|---|---|---|---|
| Page title | IBM Plex Sans | 32 / 1.1 | 600 |
| Section heading | IBM Plex Sans | 18 / 1.25 | 600 |
| Panel heading | IBM Plex Sans | 15 / 1.3 | 600 |
| Body | IBM Plex Sans | 14 / 1.55 | 400 |
| UI control | IBM Plex Sans | 12 / 1.4 | 500 |
| Meta | IBM Plex Sans | 12 / 1.45 | 400 |
| Micro label | IBM Plex Sans | 11 / 1.4 | 500–600 |
| Data / score | IBM Plex Mono | 11–44 | 400–500 |

Rules:

- Minimum body/control text is **12px**. Only count/unit badges, the mobile legend title, and citation source filenames use 11px; there is no 9–10px text.
- Data numbers use `font-variant-numeric: tabular-nums`.
- Scores and coordinates use mono so digits do not shift.
- Uppercase tracking is limited to short field labels; never used as a kicker above a heading.
- Body line-height stays at 1.45–1.65.

---

## 4. Icons

- **Set:** Lucide React only.
- **Stroke:** 1.75 in UI (specified ceiling 1.5–1.75). No filled, duotone, or mixed icon sets.
- **Sizes:** 13px inline meta, 14px controls, 19px brand mark.
- **Color:** inherits text color; accent only when the control is active.
- **No emoji, no decorative dots, no sparkle/AI-magic marks.**

Current mapping: `MapPinned` (brand), `Layers` (H3), `Store` (minimarket), `MapPin` (anchor), `MessageSquare` (copilot), `Send`, `FileDown`, `FileText`, `ArrowUpRight`, `ArrowLeft`, `Download`, `Printer`.

---

## 5. Shape, spacing, motion

- **Spacing scale:** 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40px.
- **Radius:** 8px controls, 10px compact panels, 12px panels/sheets, 999px only for true pills.
- **Borders:** 1px `--line`. No one-sided colored bars.
- **Shadows:** none on cards. `--shadow-overlay` is used only by the mobile bottom sheet.
- **Motion:** 160ms `cubic-bezier(0.2, 0.7, 0.2, 1)`; background, border, and selection only. `prefers-reduced-motion` removes non-essential transitions.
- **Focus:** 2px `--ink` outline with 2px offset on every interactive element.

---

## 6. Layout boundaries

### Desktop — 1121px and up

- 390px left rail + map. Rail holds identity, data summary, layers, candidate shortlist, selected detail, and a collapsed copilot bar.
- The copilot is collapsed by default so the shortlist keeps the height. Its 44px chevron expands it; the body is hidden only at ≥1121px.
- Seven candidate rows are visible at 1440×900 with the copilot collapsed. Selecting a candidate scrolls the rail to Detail and moves focus there.
- Map fills the remaining width and keeps OSM/CARTO attribution visible.

### Tablet and mobile — 1120px and below

- **Map-first:** full-viewport map, 56px top bar, fixed bottom sheet.
- The top bar holds the brand, dataset counts, model link, and selected score.
- The sheet has three panels: `Kandidat`, `Detail`, `Tanya`.
- Snap points: **peek 102px**, **half 46dvh**, **full 74dvh**.
- The sheet overlays the map, so `map.resize()` is not required when it moves.
- Map controls and the attribution stay above the sheet; the legend hides at half/full.
- At 641–1120px the sheet content is capped at 640px and centered; below 641px it uses the full width.

### Sheet interaction

- The grip is a button. Click/Enter/Space cycles peek → half → full → half; ArrowUp/ArrowDown move one step.
- Tabs support ArrowLeft/ArrowRight/Home/End and keep focus on the active tab.
- Selecting a candidate switches to Detail and expands to half; the sheet body resets to the top.
- Tapping a tab from peek expands to half. The selected score in the top bar opens Detail.
- Escape is not hijacked; form inputs keep normal keyboard behavior.
- `prefers-reduced-motion` removes the height and offset transitions.

### R7–R8

- R7 audits accessibility, contrast, and performance across 360/390/768/1024/1440.
- R8 deploys the new UI.

---

## 7. Components and states

- **Buttons:** 44px minimum height, 8px radius, 1px border. Primary = forest fill; secondary = white surface with line border; ghost = text only.
- **Mobile top bar:** 56px + safe area; paper background, 1px bottom rule, 32px forest mark. Model link and score button are 44px tall.
- **Bottom sheet:** white surface, 1px rule, 14px top corners, overlay shadow, safe-area padding. Header contains a 38×4px grip bar and two-line selected summary.
- **Sheet tabs:** 45px bar, three equal buttons, 12px labels, active forest underline and count chip. Panel scrolls independently.
- **Inputs:** 44px, white, 1px line, accent border on focus; placeholder uses `--muted-2`; keyboard focus uses the 2px ink ring.
- **Toggles:** icon + label; inactive white, active accent-soft with accent border; 44px tall; `aria-pressed` mirrors state. State is not carried by color alone.
- **Candidate rows:** rank chip, place summary, mono sub-line, score pill; minimum 56px, `aria-pressed` mirrors selection. Selected row uses accent-soft and accent border.
- **Score pills:** high = accent tint, mid = warn tint, low = danger tint. Numeric value is always visible; 12px mono.
- **Bars:** 6px track (`--surface-3`), forest fill; warn uses ochre. Values sit in 12px mono at the right.
- **Copilot:** collapsed bar on desktop with a 44px toggle; always expanded in the mobile Tanya panel. Messages use `role=log`, errors `role=alert`, and a pending bubble says “Menyusun jawaban…”. A 44px `Hentikan` button aborts streaming.
- **Citations:** document citations in the form `[path § heading]` are removed from the answer text and rendered as chips under a `Sumber` label. Only `README.md`, `docs/`, and `data/knowledge/` paths are accepted; the full path is the chip title/accessible label.
- **Copilot copy:** no “I’ll check…”, no “AI-powered”, no promises. Initial copy states that answers use Subang scores and document chips.
- **Loading / empty / error:** `.state` block with a title, explanation, and a 44px action when recovery is possible. Simulated failures are triggered in QA for candidates, simulation, and copilot.
- **Legend:** five discrete flat swatches; no gradient. Labels at 12px mono.
- **Tables:** 1px row rules, no zebra striping, mono for numbers. At ≤760px, report tables stack into label/value rows with `data-label`; no horizontal clipping.
- **Memo / report actions:** 44px controls, 12px labels, visible focus.
- **Memo print:** A4 (`@page` 10mm × 12mm), 9–10pt body, 1-page verified, actions hidden, colors preserved.

Every interactive element has hover, focus-visible, active, and disabled states. Layer, chain, prompt, composer, memo, and report controls meet 44px on touch. MapLibre’s 32px controls are reviewed in R4.

---

## 8. Map surface

- Basemap: CARTO Positron (light).
- **Labels stay above data.** H3 fill, H3 lines, AOI, selected fill, and hover fill are inserted before the first symbol layer. Place names and roads remain readable over the score wash.
- H3 fill: flat five-step forest ramp at 0.5 opacity; hairline cells at 0.14 ink.
- Selected cell: 0.16 forest fill + 2.4px ink outline; no glow. `h3-selected` is a top layer so the outline stays visible over markers.
- Hover cell: 0.05 ink wash; cursor becomes a pointer.
- Anchors: 2.8px ochre dots at 0.7 opacity with white stroke.
- Stores: brand colors — Indomaret `#A13B32`, Alfamart `#315E7A`, Alfamidi `#6B5B95`, other `#8A8375`; 1.4px white stroke, radius 3.6–7 by zoom.
- Legend: five score swatches, then five marker keys (`Indomaret`, `Alfamart`, `Alfamidi`, `Lainnya`, `Anchor`). Marker keys are desktop-only; mobile keeps the compact score legend.
- AOI: 1.2px dashed ink at 35% opacity.
- Controls: MapLibre buttons are **44px**; attribution and scale use 12px text.
- Mobile sheet padding: the map gets a bottom inset of the sheet height (102px peek, 46dvh half, 74dvh full), so the selected cell stays in the visible strip above the sheet. At full, zoom controls and scale are hidden; attribution remains visible above the sheet.
- Resize: a `ResizeObserver` calls `map.resize()` on container changes; orientation changes keep the canvas at viewport size.
- Attribution: OSM/CARTO visible at all breakpoints.

---

## 9. Copy rules

- Bahasa Indonesia, direct and technical. No hype.
- Name the evidence: score, factor weights, population source, date.
- Say what a number is not: “persentil relatif AOI, bukan prediksi profit.”
- No generic AI phrasing (“seamlessly”, “unlock”, “supercharge”, “AI-powered”) and no anthropomorphic assistant copy.
- Copilot answers must cite the tool or document used.
- **No ampersand or colon as copy style.** Write “dan”, use direct sentences, or use a bullet. Colons are reserved for technical data that genuinely needs them. Visible UI and copilot answers were audited to zero `&` and zero `:`.
- No tool preamble (“I’ll check…”). Start with the answer.

---

## 10. Anti-slop bans

Do not ship:

- Gradients (including gradient text), glassmorphism, decorative blur, neon glow.
- Card shadows, hard offset shadows, one-sided border bars.
- Emoji icons, sparkle icons, dot icons as decoration.
- Kicker/eyebrow text above headings.
- Card soup or pill-shaped everything.
- 9–10px text, low-contrast gray text, or all-caps labels everywhere.
- Floating chat bubbles over the map; permanent copilot panel on mobile.
- Purple/blue “AI” gradients, fake dashboards, invented metrics.
- Dark mode tokens or a theme toggle.

---

## 11. Quality snapshot

- Lighthouse desktop: **99 performance, 100 accessibility, 100 best practices, 100 SEO**.
- Lighthouse mobile: **55 performance, 100 accessibility, 100 best practices, 100 SEO**. The performance gap is MapLibre’s main-thread boot and vector-tile work under Lighthouse throttling; it is a documented exception, not a layout or contrast regression.
- CLS **0.015**; no horizontal overflow at 360/390/768/1024/1440.
- Keyboard audit: 14 tab stops, all visible, 2px focus outline.
- Visible copy audit: **0 `&`**, **0 `:`** across home, model report, memo, and the tested copilot answer.
- Favicon served from `app/icon.svg`.
- Production env uses CARTO Positron. The earlier dark-matter env was corrected during R8.
- Production hydration uses Waktu Indonesia Barat (UTC+7) for meta dates; console errors are 0.

---

## 12. Implementation map

| Concern | Source |
|---|---|
| Tokens | `app/tokens.css` |
| Global layout and components | `app/globals.css` |
| Font and token imports | `app/layout.tsx` |
| App shell | `components/MapWorkspace.tsx` |
| Map paint | `components/MapCanvas.tsx` |
| Copilot | `components/Copilot.tsx` |
| Memo actions | `app/memo/[h3]/MemoActions.tsx` |
| Model report | `app/model/page.tsx` |
| Product truth | `PRODUCT.md` |
| Refactor sequence | `docs/04-ui-refactor-plan.md` |

The token file is the only place raw color values belong. Component CSS references tokens. MapLibre paint expressions are the one exception because they cannot read CSS variables; their values must match the token table above.
