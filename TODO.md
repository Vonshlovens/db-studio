# DB Studio TODO

## Bug Fixes

- [ ] When you click and drag a table on the canvas, the table jumps to align the top left of the table with the cursor. We want it so wherever the user clicked the table initially is the point that will follow 1:1 with the cursor as they drag it

## MVP Tasks

### Foundation (Completed)
- [x] Create core TypeScript types/schema definitions
- [x] Create state management store for schema
- [x] Implement basic DBML parser (skeleton)
- [x] Implement basic DBML generator (skeleton)
- [x] Add sample data for testing

### Canvas Core (Completed)
- [x] Create Canvas component with SVG rendering
- [x] Implement basic Table card component
- [x] Add pan/zoom functionality
- [x] Add grid overlay
- [x] Implement table dragging

### Import/Export (Completed)
- [x] Create DBML import panel (textarea)
- [x] Create DBML export panel
- [x] Wire up parser to import
- [x] Wire up generator to export

### Table Visualization (Completed)
- [x] Render table headers
- [x] Render columns with types
- [x] Show constraint icons (PK, FK, etc.)
- [x] Add table selection state
- [x] Add hover states

### Relations (Basic)
- [x] Draw relation lines between tables
- [ ] Implement crow's foot notation
- [x] Update lines when tables move

### UI/UX Polish (Basic)
- [x] Add sidebar for navigation
- [x] Add toolbar with zoom controls
- [ ] Implement dark/light mode
- [x] Style table cards

## Post-MVP Features

- [ ] Ability to connect to a postgresql url and import its schema
- [ ] Auto-layout algorithms (grid, hierarchical, force-directed)
- [ ] Table groups with visual containers
- [ ] Table color customization
- [ ] Inline table/column editing
- [ ] Minimap for large schemas
- [ ] Undo/redo system
- [ ] Context menus
- [ ] Copy/paste tables
- [ ] Keyboard shortcuts
