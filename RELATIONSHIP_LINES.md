# Relationship Line Behavior

## Current Implementation

### Crow's Foot Notation ✅
- Implemented standard crow's foot notation for relationship cardinality visualization
- **one-marker**: Perpendicular line (|) indicating a mandatory one relationship
- **many-marker**: Crow's foot (<) indicating a many relationship

### Relationship Types
- `one-to-one`: Both ends show perpendicular lines (|—|)
- `one-to-many`: One end has line, other has crow's foot (|—<)
- `many-to-one`: One end has crow's foot, other has line (<—|)
- `many-to-many`: Both ends have crow's feet (<—<)

### Line Routing
Currently uses straight center-to-center lines with edge intersection:
- Calculates center points of both tables
- Determines which edge (top/bottom/left/right) the line intersects based on direction
- Adds 15px margin beyond edge for marker visibility
- Handles dynamic table heights correctly

**Location**: `src/lib/components/Canvas.svelte:109-167`

## Known Issues

### Line Entry Points (WIP)
Lines currently calculate intersection dynamically based on table centers, which can cause:
- Markers appearing at different positions as tables move
- Lines not connecting to the specific columns involved in the relationship
- Suboptimal routing when tables are positioned at various angles

## Future Improvements

> **Note from @user**: We should fix the arrow entry to a specific point, then handle the route of the arrow based on the relative location of the dragged table I think - could be wrong for sure

### Potential Solutions
1. **Fixed anchor points**: Attach lines to specific column rows rather than table centers
2. **Smart routing**: Implement orthogonal (Manhattan-style) routing that adjusts based on table positions
3. **Edge selection**: Choose which edge to connect to (top/bottom/left/right) based on relative positions to minimize line crossings
4. **Bezier curves**: Use curved paths for more organic appearance and better space utilization

## References
- **Types**: `src/lib/types.ts:72-90` (Relation, RelationType)
- **Sample data**: `src/lib/data/sample.ts:105-123` (3 many-to-one relations)
