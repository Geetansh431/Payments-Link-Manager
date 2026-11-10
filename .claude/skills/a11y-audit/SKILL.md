---
name: a11y-audit
description: Accessibility and mobile-width audit for UI changes (WCAG 2.1 AA, keyboard-only, screen-reader announcements, 320px layout). Use before finishing or committing any change under src/components or src/App.tsx.
---

# Accessibility & responsive audit

Run all three passes. Report each item as PASS / FAIL (with file:line and fix).

## 1. Automated

```bash
npm run e2e -- --grep @a11y
```

The `@a11y` Playwright specs run `@axe-core/playwright` (`withTags(['wcag2a','wcag2aa','wcag21aa'])`)
on: empty list, populated list, form with all errors visible, each filter state, mobile 320×640.
Zero `serious` / `critical` violations allowed. If a page state has no `@a11y` spec, add one.

## 2. Static review of the diff

- [ ] Every `<input>`/`<select>`/`<textarea>` has an associated `<label htmlFor>` (not placeholder-only).
- [ ] Invalid fields: `aria-invalid="true"` + `aria-describedby` → the error element id. Hint text
      is also in `aria-describedby`.
- [ ] Email/phone are inside a `<fieldset>` with `<legend>`; the "at least one" error is attached to it.
- [ ] Failed submit moves focus to the first invalid field (in DOM order).
- [ ] Async success/failure is announced through a `role="status"` region; load and save
      failures use `role="alert"`.
- [ ] Submit button disabled state is communicated (`aria-disabled` or `disabled`) and shows
      a text label change ("Creating…"), not only a spinner.
- [ ] Filter: buttons with `aria-pressed` (or radios) and visible text counts; current filter
      is not indicated by colour alone.
- [ ] Status badge contains the status word; colours meet 4.5:1 for text.
- [ ] Repeated buttons (Copy link, Mark as paid) have unique names that start with the visible
      text, e.g. `aria-label="Mark as paid: <description>"`.
- [ ] No `tabIndex` > 0; no click handlers on non-interactive elements; no `outline: none`
      without a `:focus-visible` replacement.
- [ ] The links list is a `<ul>` with an accessible name (`aria-label="Payment links"`).
- [ ] `prefers-reduced-motion` respected for any animation.

## 3. Manual (browser, via the run skill or Chrome tools)

1. Load `/?mock=reset`. Using **only Tab / Shift+Tab / Enter / Space**: fill the form,
   submit with errors, confirm focus lands on the first error, fix, submit, confirm the
   announcement and the new row; switch every filter; activate "Copy" and "Mark as paid".
2. Resize to **320px** wide: no horizontal scrollbar (`document.documentElement.scrollWidth
<= innerWidth`), cards readable, tap targets ≥ 44×44 px, form usable without zoom.
3. Zoom 200%: nothing clipped or overlapping.
