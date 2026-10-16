# RESUMEE.md: Project Context for CVForge (AI Resume Builder)

> **Audience:** AI coding agents and engineers continuing this project.
> **Rule zero:** The **current design system is frozen**. Build new screens and fix existing ones *with* it. Do not introduce new colors, fonts, radii, shadows or icon sets. Section 4 lists exactly what "the current design system" is and where the existing code drifts from it.
> **Evidence base:** `stitch_mobile_app_ui_design.zip` (4 screens + `DESIGN.md`) and `THEME.jpeg` (host-app screenshot). Every claim below was read from those files. Items I could not verify are marked **[UNVERIFIED]**.

---

## 1. What this project is

A mobile app, **CVForge**, that builds ATS-friendly resumes: pick a template, edit content in a bottom sheet while an A4 preview updates live, and use an AI "proofreader" to quantify bullets, match job keywords, and score the draft.

The Stitch export contains **4 of ~8 planned screens**. Stack: static HTML + Tailwind (CDN) + inline vanilla JS. It is a **design prototype**, not a production codebase.

---

## 2. Project inventory

```
stitch_mobile_app_ui_design/
├── archival_editorial/DESIGN.md    # Design system spec (source of truth)
├── home_dashboard/{code.html,screen.png}
├── resume_editor/{code.html,screen.png}
├── ai_assistant/{code.html,screen.png}
└── template_gallery/{code.html,screen.png}
THEME.jpeg                           # Screenshot of a different app (RIMT Academic Trust), see Section 6
```

| Screen | Shell (`<meta name="shell-type">`) | Size | Purpose |
|---|---|---|---|
| `home_dashboard` | `mobile_tab` | 26.6 KB | Greeting, continue-editing card, stats, "My Resumes" carousel, recommended layouts, FAB "New Resume" |
| `template_gallery` | `mobile_tab` | 35.7 KB | Search + filter chips, 2-col grid of 6 A4 thumbnails (Meridian, Ledger, Atlas, Slate, Kite, Fresh Start), "Sync Current Profile" toggle |
| `ai_assistant` | `mobile_tab` | 21.5 KB | Audit score 84/100, 4 correction modules, original vs suggested diff, job-keyword match |
| `resume_editor` | `mobile_stack` | 26.2 KB | Top bar, live A4 preview with zoom, draggable bottom sheet (section chips + form), 5-icon toolbar |

**Shell meaning:** `mobile_tab` screens show the 4-tab bottom nav. `mobile_stack` is a pushed screen (back arrow, no tab bar, its own toolbar).

**Routing hooks** already in markup: `data-path="home | templates | ai-tools | profile | editor"` on nav links and the home CTA. The editor has none (it is reached from home/gallery).

**Missing screens (planned, not yet designed):** onboarding, "start a resume" sheet (blank/import/paste), template preview, export sheet, profile/pricing, design/reorder tabs of the editor, template renders for T2-T8 at full size.

---

## 3. Tech and runtime facts (shared by all 4 files)

- **Tailwind via CDN** (`cdn.tailwindcss.com`) with an inline `tailwind.config`. The config is **byte-identical across all 4 files** (verified by hash). Move it to one shared file before production.
- **Fonts (Google Fonts):** Domine 400/600/700, JetBrains Mono 400/500/600.
- **Icons:** Material Symbols Outlined (variable font; some uses set `FILL 1`). `DESIGN.md` asks for Phosphor/Lucide 1.5px monoline. See drift list.
- **Viewport:** `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`.
- **Safe areas:** `.pt-safe` / `.pb-safe` helpers via `env(safe-area-inset-*)`.
- **Images:** logo and avatars are remote `lh3.googleusercontent.com/aida-public/...` URLs (1 per screen on three screens, 3 on the editor). They are temporary Stitch URLs and **will break**. Replace with bundled assets.
- **JS:** one small inline script per screen; no framework, no state store, no router. Behaviors present: FAB press feedback (home); accept-button text swap (AI); photo toggle, preview tap-scale, `prompt()` rename (editor); card highlight, chip filter, search, toast (gallery).
- **Preview geometry:** gallery thumbnails use `aspect-ratio: 595 / 842` (A4 in pt), matching the template engine spec.

---

## 4. The current design system ("Archival Editorial")

Source of truth: `archival_editorial/DESIGN.md`. Tailwind tokens mirror it.

### 4.1 Color tokens (Tailwind names)
| Role | Token | Hex |
|---|---|---|
| Canvas / paper | `background`, `surface` | `#faf9f6` (DESIGN.md prose also says `#FBFAF7`) |
| Sheet | `surface-container-lowest` | `#ffffff` |
| Container ramp | `surface-container-low / container / high / highest` | `#f4f3f1 / #efeeeb / #e9e8e5 / #e3e2e0` |
| Primary (spruce) | `primary-container` | `#143728` (buttons, active, anchors) |
| Deepest green | `primary` | `#002114` (hover, headline ink on cards) |
| Surface tint (links, ticks) | `surface-tint` | `#436654` |
| Ink | `on-surface` | `#1a1c1a` (prose spec: `#16181D`) |
| Muted ink | `secondary` / `on-surface-variant` | `#5d5e64` / `#414844` (prose spec: `#4A4F5A`) |
| Hairline | `outline-variant` | `#c1c8c2` (prose spec: `#E4E1DA`) |
| AI amber | `tertiary-fixed-dim` / `on-tertiary-container` / `tertiary-fixed` | `#f6bd56 / #c4902d / #ffdeab` (AI marks only) |
| Error | `error` | `#ba1a1a` (prose spec: `#B3382C`) |

**Heads-up:** `DESIGN.md` prose and the Tailwind config disagree on several hexes (hairline, ink, muted ink, error). The config is what actually renders. Pick one and align them. Recommended: treat the **Tailwind config as canonical** and update the prose.

### 4.2 Typography
| Token | Font | Size / line | Weight |
|---|---|---|---|
| `display-lg` | Domine | 36/44 | 600 |
| `display-lg-mobile` | Domine | 30/38 | 600 |
| `headline-lg` | Domine | 28/36 | 600 |
| `headline-md` | Domine | 20/28 | 600 |
| `body-lg` | JetBrains Mono | 16/24 | 400 |
| `body-md` | JetBrains Mono | 14/22 | 400 |
| `body-strong` | JetBrains Mono | 14/22 | 600 |
| `label-md` | JetBrains Mono | 14/20 | 500 |
| `caption-sm` | JetBrains Mono | 12/18 | 400 |

Rules: headings sit directly on paper (no pill wrappers); interactive text is at least 14px; 12px only for timestamps/metadata.

### 4.3 Spacing and layout
- 8-pt system. Tokens: `space-xs .25rem`, `space-sm .5rem`, `space-md .75rem`, `space-lg/gutter/margin 1rem`, `space-xl 1.5rem`.
- Lateral margin 16px. Tablet (600px+): content centered at 640px.
- Touch target at least 48 x 48. The code honors this widely (`min-h-[48px]`, `h-12 w-12`).
- Section rhythm: 24px gaps or 1px hairline dividers.

### 4.4 Shape, depth, components (as specified)
- **Radius 0** on cards, buttons, inputs, sheets, chips. **Circle only** for avatars and seals.
- **No drop shadows, no blur.** Depth = white sheet on paper + 1px hairline. Overlays use a flat scrim `rgba(22,24,29,.4)`.
- Primary button: solid `#143728`, white text, 48px+, hover `#16181D`. Secondary: 1px ink border. Destructive: 1px `#B3382C`.
- Inputs: 1px hairline, white, 48px, 12px padding; focus 1px `#143728`; error 1px `#B3382C`.
- Chips: sharp, 1px hairline; selected = filled spruce, white label.
- **AI suggestion = 2px amber underline on the phrase**, tap opens a bottom sheet with a diff (red strikethrough, spruce insertion). No glow, no gradient.
- Bottom nav: 4 tabs (Home, Templates, AI Tools, Profile), 64px, 1px top hairline, no blur; active = spruce + uppercase 12px mono label.

### 4.5 Template-preview palettes (allowed exception)
Gallery thumbnails hard-code per-template accents. These belong to the **resume artwork**, not the app chrome, and must stay isolated from UI tokens:
Meridian `#C2562F` terracotta, Atlas `#1C7C7D` teal, Slate `#1D232B` + `#B7D635` lime, Kite `#26305A` indigo + `#F0A22E` saffron, Fresh Start `#2F6FDE` cobalt, Ledger ink `#16181D`. These match the template spec in `RESUME.md`.

---

## 5. Where the existing code drifts from the design system

This is the most important section for anyone "keeping the design system the same". `DESIGN.md` is strict; the generated HTML is not. **Decide direction first (recommended: bring code to spec).**

| Area | `DESIGN.md` says | Code does (measured) |
|---|---|---|
| Radius | `0` everywhere except avatars | Config defines `DEFAULT .25rem`, `lg .5rem`, `xl .75rem`. Home uses `rounded-xl` x10, `rounded-lg` x6, `rounded-DEFAULT` x8; editor `rounded` x27 and a `rounded-t-xl` bottom sheet; gallery is closest (`rounded-none` x7) |
| Pills | Headings must not sit in pills; chips are sharp rectangles | `rounded-full` pills for the "Sync Complete" status, the "3" count next to My Resumes, and the FAB (home 12, editor 16, gallery 15 `rounded-full` uses, some are legitimately avatars/toggles/dots) |
| Shadows | None | `shadow-sm` (home x10, editor x9, gallery x7), `shadow-lg` on the FAB and gallery toast, `shadow-md`, `shadow-inner` (gallery x6), custom header/nav shadows on all screens |
| Blur | None | `backdrop-blur-xl` on header and bottom nav of every screen; `backdrop-blur-md` once in gallery |
| Card edges | 1px `#E4E1DA` border | Cards on home use shadow instead of a border |
| Bottom nav | 1px top hairline, flat | Translucent white (`/95`) with blur and a custom shadow |
| Selected card (gallery) | Hairline/flat | Uses a 2px `outline-primary-container`. Acceptable, but not in the spec |
| Icons | Phosphor/Lucide monoline | Material Symbols Outlined |
| Type | Tokens only | Gallery mixes raw `font-bold` (x14) and `font-mono` (x7) with tokens |
| Min text | 14px for interactive text | `caption-sm` (12px) appears 38-47 times per screen. Audit that no tappable label uses it |
| Viewport | n/a | `user-scalable=no`, `maximum-scale=1` blocks pinch zoom. The editor preview needs its own pinch handler, and the page-level lock hurts accessibility |
| Editor behaviors | Spec'd interactions | `prompt()` for rename and tap-to-`scale-105` on the preview are prototype stand-ins; replace with an inline text field and real pinch/double-tap zoom |

**Fix recipe (stays inside the system):**
1. Set Tailwind `borderRadius` to `{ DEFAULT:'0', lg:'0', xl:'0', full:'9999px' }` and use `rounded-full` **only** for avatars and seals.
2. Delete every `shadow-*`; replace with `border border-outline-variant`.
3. Remove `backdrop-blur-*`; make header and nav solid `bg-surface` with a 1px hairline.
4. Replace the FAB pill with a sharp spruce rectangle (keep 52px height).
5. Replace status/count pills with sharp 1px-bordered tags.
6. Swap icons to one monoline family (Lucide), or formally amend `DESIGN.md` to bless Material Symbols.

---

## 6. THEME.jpeg: analysis of the host-app screenshot

**What it shows:** a phone screenshot of **"RIMT Academic Trust: Overview"**, a student portal (RIMT University). It is **not** CVForge.

**Content and structure (top to bottom):**
1. Header: RIMT University logo, small caps label "RIMT ACADEMIC TRUST", title "Overview", notification bell with red dot, circular profile photo.
2. Hero card (near-black, gold-rimmed avatar with an "S" badge, green shield icon): "Good morning ✨ Shahzeb", "BSC CYBERSECURITY · Batch 1st Year (1st Sem) · 26BSCCS005".
3. Search bar with a filter/tune icon: "Search documents and projects".
4. **Academic Overview** with a "SESSION 2025-26" tag and a 2x2 grid of tinted tiles: *1st Current Semester* (rose, Active), *8.5 Cumulative CGPA* (blue-grey, Scale 10.0), *1 Academic Project* (lavender, Portfolio), *85% Profile Completed* (green).
5. **Quick Actions** with a "Services Hub >" button: *Resume* (PDF ready), *Internships* (2 verified).
6. Floating bottom bar, 5 tabs: **Home, Placement, Projects, Certificates, Profile**. A translucent settings FAB and a "Tools" label overlap it (screenshot artifact).

**Visual language of the host app:** rounded cards (~20-28px radius), pastel tinted tiles with a white inner panel, pill badges, soft shadows, a floating pill-shaped bottom bar, maroon/rose accent for the active tab and the Services Hub button, dark navy hero, sans-serif type, emoji in the greeting.

**Why it matters:** the Quick Actions card reads **"Resume, PDF ready"**. The resume builder is very likely a **feature that launches from this student app**. The student's real data is available to prefill the resume:

| Host-app field | Resume field |
|---|---|
| Shahzeb | `personal.name` |
| BSc Cybersecurity | `education[0].degree` |
| RIMT University, Batch 1st Year (1st Sem) | `education[0].institute` / dates |
| CGPA 8.5 (scale 10) | `education[0].score` |
| 1 Academic Project | `projects[0]` |
| 26BSCCS005 | internal ID, **do not print on the resume** |
| Profile 85% complete | drives the "Sync Current Profile" toggle in the gallery |

**Template recommendation from this data:** a first-year student with one project and no work history is exactly the **Fresh Start** template (education and projects first, fresher-focused). Make it the default suggestion for this user.

### 6.1 The conflict you must resolve
The host app and CVForge are **two visually different systems**:

| | Host (THEME.jpeg) | CVForge (DESIGN.md) |
|---|---|---|
| Corners | Large radius | 0 radius |
| Depth | Soft shadows, pastel tiles | Flat, hairlines |
| Type | Sans-serif | Domine + JetBrains Mono |
| Accent | Maroon/rose, navy | Spruce green, amber |
| Nav | Floating pill, 5 tabs | Fixed bar, 4 tabs |

**Working assumption in this file:** keep the **CVForge Archival Editorial** system for every resume screen (that is what "keep the current design system" refers to in the zip). THEME.jpeg is used for **content and integration context only**, not for restyling.
**Integration seam:** the host app opens CVForge as a full-screen module (like `mobile_stack`). CVForge's own 4-tab bar appears inside the module only. Add a clear Back/Close to return to the host's Overview. **Open question:** if instead the resume screens should adopt the RIMT look, `DESIGN.md` must be replaced, not patched.

---

## 7. Architecture notes for production

- **Template engine** (from `RESUME.md`): templates are data-bound components on a 595 x 842 pt canvas, built from text, shapes and one photo slot; preview scales to device width and must match PDF export. Gallery thumbnails already respect this ratio.
- **Data model:** see the schema in `RESUME.md` Section 9 (`personal`, `summary`, `experience`, `education`, `skills`, `projects`, `certifications`, `languages`, `declaration`, `meta`).
- **Suggested componentization** (extract from repeated markup): `AppHeader`, `BottomNav`, `ResumeCard`, `TemplateCard`, `StatTile`, `SectionChips`, `BottomSheet`, `FormField` (label + counter + input), `AiSuggestionCard`, `DiffBlock`, `ScoreRing`, `KeywordTag`, `Toggle`.
- **Framework suggestion:** React Native or Flutter if shipping as an app; Vite + React + Tailwind if shipping as a PWA inside the student portal. Either way, compile Tailwind (no CDN).
- **Accessibility to add:** focus rings (spruce 1px per spec), `aria-pressed` on chips, `aria-checked` on toggles (present on the editor toggle), live region for "Saved just now", reduced-motion handling.

---

## 8. Known content and consistency issues

- **Sample persona is Aarav Mehta**, a design lead, while the host app's real user is **Shahzeb** (fresher, cybersecurity). Keep Aarav only in mockups; wire real data in the app.
- **Gallery shows 6 templates** under a header saying "8 Formats Available". T7 is named "Fresh Start" in the gallery, and T8 "Studio Grid" appears only on Home. Two templates (Studio Grid, Quill) have no gallery card.
- **Template naming mismatch:** `RESUME.md` has Quill and Studio Grid; the gallery omits them. Add both or fix the count.
- **ATS labels are inconsistent:** "ATS: Med", "ATS: 99%", "ATS: High", "ATS: PASS", "Growth" (a category tag in the ATS slot on Kite). Standardize to `High / Medium / Low` plus an optional numeric score.
- **Marketing claims to verify before shipping:** "DIN 5008 & ISO 216 manuscript specifications", "Typewritten Integrity Standard", "99% ATS CERT.", "Recruiter Views 142". These look decorative; no data source exists in the code. **[UNVERIFIED]**
- Stats like "88/100 ATS Score", "Fit: 94%", "Audit 84/100" are hard-coded. A scoring function and its rubric need to be defined.
- Editor preview footer says "A4 Format · 300 DPI" while the engine renders vector PDF. Reword to avoid implying raster output.

---

## 9. Do / Don't for agents working in this repo

**Do**
- Use only tokens from Section 4. Add no new colors, fonts or sizes.
- Keep AI marks as the 2px amber underline plus diff sheet.
- Keep 48dp targets, 16px margins, 24px section gaps.
- Keep template accent colors confined to resume artwork.
- Prefill from the host profile; show "Synced from profile" with a source label.

**Don't**
- Don't add gradients, glass, glow, blur, emojis, or pill headings.
- Don't add drop shadows. Use a hairline border.
- Don't render text inside images in templates (ATS and selectable text).
- Don't print the enrollment ID (`26BSCCS005`) or any other internal ID on a resume.
- Don't auto-apply AI edits; always require Accept / Edit / Dismiss.
- Don't rely on `prompt()`, `alert()` or CDN Tailwind in anything shipped.

---

## 10. Suggested next steps (ordered)

1. Confirm the open question in Section 6.1 (CVForge system vs host system).
2. Reconcile `DESIGN.md` prose with the Tailwind config (one set of hexes).
3. Apply the fix recipe in Section 5 to the four existing screens.
4. Extract a shared `tailwind.config` and component partials.
5. Design the missing screens (Section 2), starting with the Export sheet and Template Preview.
6. Build the template renderer with Fresh Start first, then Ledger and Meridian.
7. Wire the host-profile sync (Section 6 mapping) and the ATS scoring rubric.
