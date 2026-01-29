# Auto Layout

## Purpose

Automatically arrange tables on the canvas using predefined algorithms to reduce manual organization effort.

## Layout Algorithms

### Snowflake

- Central fact table(s) in the middle
- Dimension tables radiating outward
- Good for star/snowflake schema patterns
- Considers foreign key relationships to determine centrality

```
        ┌───┐
        │ D │
        └─┬─┘
    ┌───┐ │ ┌───┐
    │ D ├─┼─┤ D │
    └───┘ │ └───┘
        ┌─┴─┐
        │ F │  (Fact)
        └─┬─┘
    ┌───┐ │ ┌───┐
    │ D ├─┼─┤ D │
    └───┘   └───┘
```

### Hierarchical (Top-Down)

- Root tables at top
- Child tables flow downward
- Good for tree-like structures

### Force-Directed

- Physics simulation
- Related tables attract
- Unrelated tables repel
- Results in organic clustering

### Grid

- Simple row/column arrangement
- Alphabetical or by group
- Uniform spacing

### By Group

- Groups arranged as blocks
- Tables within group auto-arranged
- Groups positioned to minimize cross-group relation lines

## User Controls

### Trigger Layout

- Button: "Auto Layout"
- Dropdown to select algorithm
- Keyboard shortcut

### Options

- Spacing between tables
- Direction (top-down, left-right) for hierarchical
- Whether to respect existing groups

### Partial Layout

- Apply layout to selected tables only
- "Re-layout this group"

## Behavior

### Non-Destructive

- Layout is a suggestion
- User can manually adjust after auto-layout
- Undo available

### Animation

- Smooth transition from current positions to new positions
- Option to skip animation

## Relation-Aware

All algorithms should:

- Minimize edge crossings where possible
- Keep highly-connected tables closer
- Respect relation cardinality for positioning hints
