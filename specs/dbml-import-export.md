# DBML Import/Export

## Purpose

Allow users to import existing DBML schemas and export modified schemas back to DBML format.

## Import

### Input Methods

- Paste DBML text into editor panel
- Upload `.dbml` file
- Load from URL (optional)

### Parsing Behavior

- Parse DBML syntax into internal schema representation
- Extract tables, columns, types, constraints, and relations
- Extract table groups if defined
- Preserve comments and annotations

### Error Handling

- Display syntax errors with line numbers
- Highlight problematic sections
- Allow partial import of valid portions (with warning)

## Export

### Output Options

- Copy to clipboard
- Download as `.dbml` file

### Export Behavior

- Generate valid DBML from current schema state
- Include all tables, columns, relations
- Include table groups
- Preserve user comments where possible
- Format output for readability

## Schema Representation

The internal schema model should capture:

```
Schema
├── Tables[]
│   ├── name
│   ├── alias (optional)
│   ├── columns[]
│   │   ├── name
│   │   ├── type
│   │   ├── constraints (pk, not null, unique, default)
│   │   └── notes
│   └── indexes[]
├── Relations[]
│   ├── from (table.column)
│   ├── to (table.column)
│   └── type (one-to-one, one-to-many, many-to-many)
├── TableGroups[]
│   ├── name
│   └── tables[]
└── Enums[]
```

## Example

**Input:**
```dbml
Table users {
  id int [pk]
  name varchar
}

Table posts {
  id int [pk]
  user_id int [ref: > users.id]
}
```

**Internal → Export → Same DBML structure**
