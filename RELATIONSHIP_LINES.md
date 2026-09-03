# Relationship Line Behavior

## Current Implementation

Relationship lines attach to the foreign-key and referenced **column rows**, then route with orthogonal (Manhattan) segments around the table cards.

### Crow's Foot Notation
- **one-marker**: Perpendicular bar on the one side
- **many-marker**: Crow's foot on the many side

### Relationship Types
- `one-to-one`: Bar on both ends
- `one-to-many`: Bar on the from side, crow's foot on the to side
- `many-to-one`: Crow's foot on the from side, bar on the to side
- `many-to-many`: Crow's feet on both ends

### Line Routing
- Anchors sit on the left or right edge of the specific columns in the relationship
- Opposite sides are used when there is a clear horizontal gap between tables
- Stacked or overlapping tables use a same-side detour so the line does not cut through cards
- Cardinality marks are drawn as SVG paths (not `<marker>` elements) so they stay aligned with orthogonal segments

**Location**: `src/lib/editor/relation-routing.ts`, rendered by `src/lib/components/Canvas.svelte`

## Import

Creating a diagram and importing DBML extracts:

- Inline column refs (`user_id int [ref: > users.id]`)
- Standalone `Ref:` / `Ref { }` statements

Relations are stored on the schema and drawn as soon as tables are laid out.

## Future Improvements

- Avoid routing through unrelated tables that sit in the gutter between two endpoints
- Optional bezier curves
- Click-to-select a relation on the canvas
