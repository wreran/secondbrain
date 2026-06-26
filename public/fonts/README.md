# Font Setup Instructions

## Font Files Placement

Place your font files in this `public/fonts/` directory:

### Horizon (Futuristic Brand/Header Font)
```
public/fonts/Horizon.ttf        ← Horizon Normal (main header font)
public/fonts/Horizon-Outline.ttf ← Horizon Outline (decorative only, optional)
```

**Note:** If your Horizon file is `.otf` instead of `.ttf`, rename it accordingly and update the `@font-face` declarations in `app/globals.css`:
- Change `url('/fonts/Horizon.ttf') format('truetype')` to `url('/fonts/Horizon.otf') format('opentype')`

### Montserrat (Main UI Font)
```
public/fonts/Montserrat-Regular.ttf      ← Body text, paragraphs
public/fonts/Montserrat-Medium.ttf        ← Descriptions, subtitles
public/fonts/Montserrat-SemiBold.ttf      ← Buttons, navigation
public/fonts/Montserrat-Bold.ttf          ← Graph node titles
```

## Font Usage Guide

### Horizon Normal (`--font-heading`)
**Use for:**
- Main hero title ("SECOND BRAIN")
- Brand/logo text
- Major section headings
- Graph category labels (IDEA, ACTION, RISK, DECISION, QUESTION)
- Short decorative UI labels

**Avoid for:**
- Paragraphs
- Long node titles
- Forms
- Sidebar descriptions

### Montserrat (`--font-body`)
**Use for:**
- All body text and paragraphs
- Buttons and navigation
- Form labels and inputs
- Graph node titles and descriptions
- Tooltips, modals, sidebar content

**Weights loaded:**
- `400` (Regular) - body text
- `500` (Medium) - descriptions, subtitles
- `600` (SemiBold) - buttons, nav items
- `700` (Bold) - graph node titles

## CSS Variables

The typography system uses these CSS variables defined in `app/globals.css`:

```css
--font-heading: "Horizon", "Space Grotesk", sans-serif;
--font-heading-outline: "Horizon Outline", "Horizon", sans-serif;
--font-body: "Montserrat", "Inter", sans-serif;
```

## Example Classes

```css
/* Hero title */
.brand-title {
  font-family: var(--font-heading);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* Graph node label (IDEA, ACTION, etc.) */
.node-label {
  font-family: var(--font-heading);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.75rem;
}

/* Graph node title */
.node-title {
  font-family: var(--font-body);
  font-weight: 700;
}

/* Graph node description */
.node-description {
  font-family: var(--font-body);
  font-weight: 500;
}

/* Decorative outline text (if Horizon Outline available) */
.decorative-outline {
  font-family: var(--font-heading-outline);
  opacity: 0.08;
  font-size: 8rem;
}