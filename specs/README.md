# DB Studio Specifications

A visual database schema editor inspired by dbdiagram.io and Supabase Studio.

## Overview

DB Studio allows users to design, visualize, and modify database schemas through an intuitive drag-and-drop interface. It uses DBML (Database Markup Language) as its interchange format.

## Core Concepts

- **Canvas**: The main workspace where tables are visualized and arranged
- **Tables**: Visual representations of database tables with columns and metadata
- **Relations**: Lines connecting tables showing foreign key relationships
- **Table Groups**: Logical groupings of related tables
- **Layout**: The saved positions and organization of tables on the canvas

## Spec Documents

| Spec | Description |
|------|-------------|
| [DBML Import/Export](./dbml-import-export.md) | Parsing DBML input and generating DBML output |
| [Canvas & Visualization](./canvas-visualization.md) | Interactive canvas with drag-and-drop tables |
| [Table Groups](./table-groups.md) | Grouping tables for organization |
| [Auto Layout](./auto-layout.md) | Automatic arrangement algorithms |
| [Theming & Appearance](./theming-appearance.md) | Light/dark mode and table colors |

## User Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Import DBML │ ──► │ Edit Canvas  │ ──► │ Export DBML │
└─────────────┘     └──────────────┘     └─────────────┘
                          │
                          ▼
                    ┌──────────────┐
                    │ Save Layout  │
                    └──────────────┘
```

## Out of Scope (v1)

- Direct database connections
- SQL generation
- Team collaboration / real-time sync
- Version history
