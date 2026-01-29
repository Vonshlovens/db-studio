# Canvas & Visualization

## Purpose

Provide an interactive canvas where users can view, arrange, and modify their database schema visually.

## Canvas

### Viewport

- Infinite canvas with pan and zoom
- Minimap for navigation (optional)
- Zoom controls: scroll wheel, pinch, buttons
- Pan: click-drag on empty space, or hold space + drag

### Grid & Snapping

- Optional grid overlay
- Snap-to-grid when dragging tables
- Snap-to-alignment with nearby tables

## Table Cards

### Display

- Table name as header
- List of columns with:
  - Column name
  - Data type
  - Constraint icons (PK, FK, unique, not null)
- Collapse/expand toggle for large tables

### Interactions

- **Drag**: Move table on canvas
- **Click**: Select table (show details panel)
- **Double-click header**: Rename table
- **Right-click**: Context menu (delete, duplicate, edit)

### Visual States

- Default
- Selected (highlighted border)
- Hover (subtle highlight)
- Grouped (colored by group)

## Relations (Edges)

### Display

- Lines connecting foreign key columns to referenced columns
- Crow's foot notation for cardinality
- Different line styles for relation types

### Routing

- Automatic path finding to avoid overlapping tables
- Bezier curves or orthogonal lines (user preference)
- Anchor points on table edges

### Interactions

- Hover: highlight the relation
- Click: select relation for editing/deletion

## Editing on Canvas

### Add Table

- Button or keyboard shortcut
- Click to place on canvas
- Opens inline editor for table name

### Edit Table

- Side panel or modal for detailed editing
- Add/remove/reorder columns
- Set column types and constraints

### Add Relation

- Drag from column to column
- Or use relation editor panel

### Delete

- Select + Delete key
- Context menu option

## Layout Persistence

- Save table positions (x, y coordinates)
- Save zoom level and viewport position
- Layout stored separately from schema data
- Export/import layout as JSON (optional)
