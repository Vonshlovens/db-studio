# Table Groups

## Purpose

Allow users to organize related tables into logical groups for better visual organization and schema comprehension.

## Concepts

### Table Group

- A named collection of tables
- Visual boundary on canvas
- Tables can belong to zero or one group
- Maps to DBML `TableGroup` syntax

## Visual Representation

### Group Container

- Rounded rectangle encompassing member tables
- Group name as header/label
- Distinct background color (user-selectable or auto-assigned)
- Subtle border to define boundary

### Behavior

- Container auto-resizes to fit member tables
- Padding around tables within group
- Groups can overlap (z-order management)

## Interactions

### Creating Groups

- Select multiple tables → "Create Group"
- Right-click → "Add to new group"
- Drag table into existing group container

### Managing Groups

- Rename group (click on header)
- Change group color
- Dissolve group (ungroup tables)
- Remove table from group (drag out or context menu)

### Moving Groups

- Drag group header to move entire group
- All member tables move together
- Individual tables can still be repositioned within group

## DBML Integration

### Import

```dbml
TableGroup ecommerce {
  users
  orders
  products
}
```

Tables in the group are visually grouped on import.

### Export

Groups are exported as DBML `TableGroup` blocks.

## Ungrouped Tables

- Tables not in any group appear freely on canvas
- Optional: "Ungrouped" pseudo-group in sidebar list

## Group List Panel

- Sidebar showing all groups
- Click to focus/zoom to group
- Drag tables between groups
- Collapse/expand group contents
