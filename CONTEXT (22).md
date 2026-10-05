# CONTEXT.md — Student Profile Modal Redesign (RIMT T&P Admin Portal)

> **For:** Antigravity IDE AI (Claude / Gemini)
> **App:** RIMT Academic Trust — T&P Web Admin Portal (`http://localhost:3000`)
> **Screen:** Student Management → "Student Profile" / "View Profile" modal
> **Role to assume:** Senior Frontend Engineer + Senior Design Engineer

---

## 0. Read This First (Working Rules)

1. **Do not crawl the whole project folder.** Search `ADMIN.md` and `APP.md` first to find the profile modal component, the student card component, the tab bar, and the student data model. Open only the files those documents point to.
2. **Do not redesign anything outside this brief.** Layout, content, data and behaviour of the modal stay the same. Only the items in Section 4 change.
3. **Reuse the existing theme tokens** (the crimson used by the active "Student Management" sidebar item and the "All Talent (6)" pill). Do not hard-code new random colors. If a token does not exist, add one to the theme file and use it everywhere.
4. Keep everything responsive and keyboard accessible. Do not break the dark/light handling the app already has.

---

## 1. Goal

The student profile modal currently has a **blue banner**, a **dark navy active tab** and an **off-theme "View Profile" button**. These clash with the portal's identity, which is **crimson red + white, with blue as a secondary accent**.

Bring the modal and the student cards into the portal theme, and let students personalise their own banner (LinkedIn-style).

---

## 2. Analysis of the Current Modal (Screenshot 1)

### 2.1 Structure (top to bottom)

| Zone | What exists now |
|---|---|
| Overlay | Blurred dashboard behind, dark scrim |
| Modal shell | White card, large radius (~28px), soft shadow, ~950px wide, scrolls internally |
| **Banner** | ~160px tall band at the top, **blue gradient** (royal blue → light sky blue, fading to white at the bottom). Purely decorative, no edit control |
| Close button | Circular translucent grey button, top-right, over the banner |
| Avatar | ~118px rounded-square photo, thick white border, overlaps the banner bottom edge, left aligned |
| Identity | Name "Ismail" (bold, ~28px) + blue verified badge; subtitle "Department of Computer Applications Scholar @ RIMT University \| Software Engineer" in grey |
| Meta row | Four icon + text items: roll number (26BCA099), department, "1st Year (1st Sem)", "RIMT University, Punjab" |
| Strength pill | Right-aligned small pill: blue dot + "79% · Strong" |
| **Tab bar** | Sticky bar with tabs: **About, Skills, Projects, Certificates, Academics**. Active tab = **near-black/dark navy pill** with a gold icon and white text. Inactive = grey text + grey icon. Right side: **Email** (light blue tint, blue text) and **Call** (light green tint, green text) action buttons |
| Content | White section cards on a very light grey-blue background, large radius, thin border. Shown: a project card with "Source Code" and "Live Demo" links, then "Uploaded Certificates & Documents" card (count badge "1") with a certificate thumbnail, green "VERIFIED" badge and title "Black Gold Formal Appreciation Certificate" |

### 2.2 Problems found

1. Banner is blue and sits outside the red/white theme. It is also not changeable.
2. Active tab is dark navy/black. It should be crimson. Inactive tabs have no meaningful hover.
3. The "View Profile" button on student cards uses a color that looks inconsistent with the rest of the portal.
4. Student cards in the grid (visible blurred behind the modal) also carry the same blue banner and feel flat compared with the glossy dashboard cards.

---

## 3. Design Language to Match (Screenshots 2 and 3)

The portal's real look, taken from the dashboard and the "All Talent (6)" pill:

- **Primary:** deep crimson / wine red. Gradient roughly `#A31D35 → #8A1228` (sample the exact values from the existing "All Talent (6)" pill and the active sidebar item, and store them as tokens).
- **Surfaces:** white cards, very large radius (20–28px), soft diffuse shadow, faint pastel gradient washes (pink, mint, sky blue, cream).
- **Hero/dark areas:** deep maroon-black with a subtle glow, not pure black.
- **Accent:** blue is allowed as a small secondary accent (icons, chips), never as a dominant surface.
- **Buttons:** pill shaped, glossy crimson gradient, white bold text, icon on the left, soft inner top highlight and a red-tinted drop shadow.

### Suggested tokens (reuse if equivalents already exist)

```css
:root {
  --brand-red-600: #A31D35;
  --brand-red-700: #8A1228;
  --brand-red-800: #6E0E20;
  --brand-red-50:  #FDECEF;   /* hover tint */
  --brand-red-100: #FAD6DC;
  --brand-blue-500: #3B82F6;  /* accent only */
  --gloss-gradient: linear-gradient(135deg, var(--brand-red-600) 0%, var(--brand-red-700) 100%);
  --gloss-shadow: 0 8px 20px -6px rgba(138, 18, 40, .55),
                  inset 0 1px 0 rgba(255,255,255,.35);
}
```

---

## 4. Required Changes

### 4.1 Banner behind the profile photo (on-theme + student-editable)

**A. Default banner (when the student has not uploaded one)**

Replace the blue gradient with an on-theme default using the red/white/blue combo, close to the dark hero banner in the dashboard:

```css
.profile-banner-default {
  background:
    radial-gradient(120% 140% at 85% 0%, rgba(59,130,246,.28) 0%, transparent 55%),  /* soft blue glow */
    radial-gradient(90% 120% at 0% 100%, rgba(255,255,255,.18) 0%, transparent 60%), /* white sheen */
    linear-gradient(135deg, #8A1228 0%, #A31D35 55%, #6E0E20 100%);                  /* crimson base */
}
```

Keep the existing bottom fade into white so the avatar overlap still looks clean.

**B. Student can change the banner at will (LinkedIn style)**

- Banner area shows the student's uploaded image when present (`object-fit: cover`), otherwise the default above.
- Recommended banner size: **1584 × 396 (4:1)**. Modal banner height stays ~160px.
- Accepted: JPG, PNG, WebP. Max 5 MB. Validate type and size on the client and show a friendly error.
- Editing options for the student:
  - **Upload / change banner**
  - **Reposition / crop** (drag to adjust, fixed 4:1 frame)
  - **Pick a preset** (3–5 on-theme gradients: crimson, crimson + blue glow, maroon, white + red, etc.)
  - **Remove banner** (falls back to default)
- **Where the editing UI lives:** the student edits their own banner in the **student-facing app** (see `APP.md`). In the admin modal, only **render** the banner. Show a small camera/pencil edit control in the admin modal **only if** the admin is allowed to manage profiles there, and make it a reset-to-default action at minimum (for moderation).
- **Storage and data** (confirm names from `ADMIN.md` / `APP.md`; the project uses Supabase):
  - Add a nullable `banner_url` (text) column to the student profile table, plus optional `banner_preset` (text) and `banner_position` (jsonb or numeric y-offset).
  - Create a storage bucket for banners (e.g. `profile-banners`), files stored under the student's id folder.
  - Row-level security: a student can read and write only their own banner; admins can read all and reset.
  - Replace the old file when a new one is uploaded to avoid orphaned files.
- Loading and error states: skeleton shimmer while the image loads, fall back to the default banner if the URL fails.

### 4.2 Tab bar colors (About, Skills, Projects, Certificates, Academics)

| State | Current | Required |
|---|---|---|
| **Active** | Dark navy/black pill, gold icon | **Crimson glossy pill** using `--gloss-gradient`, white text, white icon, `--gloss-shadow` |
| **Hover** (inactive) | None / barely visible | **Red**: text and icon turn `--brand-red-600`, background becomes `--brand-red-50`, 150–200ms ease transition |
| **Inactive** | Grey text and icon | Keep grey |
| **Focus-visible** | Not clear | 2px red ring with offset |

Notes:
- Example: when the user hovers "Skills" while "About" is active, Skills turns red; the active tab stays solid crimson.
- Keep the same pill radius, padding and icon size so layout does not shift.
- Do not change the Email (blue tint) and Call (green tint) buttons' meaning; only make sure their radius and height match the new tab pills.

### 4.3 "View Profile" button on student cards

- Redesign it to match the **"All Talent (6)" pill (Screenshot 3)** exactly in style:
  - Crimson gradient (`--gloss-gradient`), white bold text, pill radius, leading icon (profile/users), same height and font weight
  - Soft inner top highlight and red-tinted shadow (`--gloss-shadow`)
  - **Hover:** slightly brighter gradient, lift `translateY(-1px)`, stronger shadow, a subtle diagonal light sweep
  - **Active/pressed:** return to rest position, reduced shadow
  - **Focus-visible:** red ring
- Remove the current off-theme color entirely, no leftover blue/purple styles.

### 4.4 Glossy "VIP" student card

- Student cards in the talent grid get the same premium glossy feel as the dashboard stat cards:
  - White base, large radius (24px), soft shadow, a faint pastel gradient wash, thin translucent white border
  - A diagonal glass-sheen highlight across the top-left, very subtle (6–10% white)
  - Card banner area uses the **new on-theme banner** (student's banner or the crimson default), no more blue
  - Hover: lift 2–4px, shadow deepens with a faint red tint
- Keep all current card content (photo, name, department, strength, skills, buttons). Only the visual treatment changes.

```css
.student-card {
  position: relative;
  border-radius: 24px;
  background: linear-gradient(160deg, #FFFFFF 0%, #FFF5F6 100%);
  border: 1px solid rgba(255,255,255,.8);
  box-shadow: 0 10px 30px -12px rgba(138,18,40,.25);
  overflow: hidden;
  transition: transform .2s ease, box-shadow .2s ease;
}
.student-card::before {            /* glass sheen */
  content: "";
  position: absolute; inset: 0;
  background: linear-gradient(120deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 35%);
  pointer-events: none;
}
.student-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 40px -14px rgba(138,18,40,.4);
}
```

---

## 5. Do Not Change

- Modal size, scroll behaviour, sticky tab bar behaviour
- Avatar size, border and overlap position
- Name, verified badge, subtitle, meta row content and order
- Strength pill (blue dot + "79% · Strong")
- Certificates, projects and academics content and their data flow
- Email and Call actions, and the green "VERIFIED" badge
- Any other module of the portal

---

## 6. Acceptance Criteria

1. No blue banner remains. Default banner is the crimson-based on-theme gradient with a soft blue glow.
2. A student can upload, reposition, pick a preset for, and remove their banner; the admin modal and the student card both show it, with a safe fallback.
3. Active tab is crimson glossy; hovering any inactive tab turns it red; no layout shift.
4. "View Profile" button visually matches the "All Talent (6)" pill in color, shape, gloss, hover and pressed states.
5. Student cards have the glossy premium look and the new banner.
6. All colors come from shared tokens; no hard-coded off-theme colors in the changed components.
7. Contrast: white text on crimson meets WCAG AA; focus states are visible; works at mobile, tablet and desktop widths.
8. No regressions: modal tabs still switch content, Email and Call still work, certificates still render.

---

## 7. Suggested Implementation Order

1. Locate the components via `ADMIN.md` / `APP.md` (profile modal, tab bar, student card, view-profile button, banner).
2. Add or confirm theme tokens (Section 3).
3. Restyle tab bar states (4.2) and the View Profile button (4.3).
4. Restyle student card (4.4) and default banner (4.1-A).
5. Add the banner data model, storage and RLS (4.1-B), then the student-side upload UI.
6. Test the acceptance criteria, then report back a short summary of the files changed.
