# Theming & Appearance

## Purpose

Allow users to customize the visual appearance of the app and individual schema elements.

## App Theme

### Modes

- **Light**: Light background, dark text
- **Dark**: Dark background, light text

### Behavior

- Toggle in settings/toolbar
- Respects system preference by default
- User choice persists across sessions

### Future Expansion (v2+)

- Custom theme colors
- High contrast mode
- Additional preset themes

## Table Colors

### Purpose

- Visual differentiation between tables
- Highlight important or related tables
- Personal organization preference

### Color Options

- Preset palette (8-12 colors)
- Color applies to table header/border
- Body remains neutral for readability

### Applying Colors

- Right-click table → "Set Color"
- Color picker in table details panel
- "Clear Color" to reset to default

### Persistence

- Table colors saved with layout data
- Not part of DBML (visual-only metadata)

## Group Colors

- Each group has a background tint
- Auto-assigned from palette on creation
- User can override via group settings
- Tables inherit subtle tint when in group

## Relation Line Colors

- Default: neutral gray
- Option to color by relation type
- Option to match source table color (subtle)

## Color Palette

```
┌─────────────────────────────────────────┐
│ Default Palette                         │
├─────┬─────┬─────┬─────┬─────┬─────┬─────┤
│ Red │ Org │ Yel │ Grn │ Blu │ Pur │ Gry │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

Colors should work well in both light and dark themes.
