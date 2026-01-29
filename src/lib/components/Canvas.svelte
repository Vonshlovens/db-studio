<script lang="ts">
	import type { Table, Relation, Position, ViewportState } from '$lib/types';
	import TableCard from './TableCard.svelte';

	interface Props {
		tables: Table[];
		relations: Relation[];
		viewport: ViewportState;
		selectedTableId: string | null;
		onPan?: (dx: number, dy: number) => void;
		onZoom?: (factor: number, centerX: number, centerY: number) => void;
		onSelectTable?: (tableId: string) => void;
		onTableMove?: (tableId: string, position: Position) => void;
	}

	let {
		tables,
		relations,
		viewport,
		selectedTableId,
		onPan,
		onZoom,
		onSelectTable,
		onTableMove
	}: Props = $props();

	// SVG element reference
	let svgElement: SVGSVGElement;

	// Drag state
	let isDragging = $state(false);
	let isPanning = $state(false);
	let dragTableId: string | null = $state(null);
	let lastMousePos = $state({ x: 0, y: 0 });
	let dragOffset = $state({ x: 0, y: 0 }); // Offset from table position to click point

	// Grid configuration
	const GRID_SIZE = 20;
	const GRID_COLOR = '#e5e7eb';

	// Transform for the view
	function getTransform(): string {
		return `translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`;
	}

	// Convert screen coordinates to world coordinates
	function screenToWorld(screenX: number, screenY: number): Position {
		const rect = svgElement.getBoundingClientRect();
		const x = (screenX - rect.left - viewport.x) / viewport.zoom;
		const y = (screenY - rect.top - viewport.y) / viewport.zoom;
		return { x, y };
	}

	// Handle mouse down on canvas background
	function handleCanvasMouseDown(e: MouseEvent) {
		if (e.target === svgElement || (e.target as Element).tagName === 'rect' && (e.target as Element).getAttribute('id') === 'grid-bg') {
			isPanning = true;
			lastMousePos = { x: e.clientX, y: e.clientY };
		}
	}

	// Handle mouse down on table
	function handleTableDragStart(tableId: string, e: MouseEvent) {
		const table = tables.find(t => t.id === tableId);
		if (!table) return;

		const worldPos = screenToWorld(e.clientX, e.clientY);
		// Store the offset from table position to click point
		dragOffset = {
			x: worldPos.x - table.position.x,
			y: worldPos.y - table.position.y
		};

		isDragging = true;
		dragTableId = tableId;
	}

	// Handle mouse move
	function handleMouseMove(e: MouseEvent) {
		if (isPanning) {
			const dx = e.clientX - lastMousePos.x;
			const dy = e.clientY - lastMousePos.y;
			onPan?.(dx, dy);
			lastMousePos = { x: e.clientX, y: e.clientY };
		} else if (isDragging && dragTableId) {
			const worldPos = screenToWorld(e.clientX, e.clientY);
			// Subtract the offset so the click point follows the cursor
			onTableMove?.(dragTableId, {
				x: worldPos.x - dragOffset.x,
				y: worldPos.y - dragOffset.y
			});
		}
	}

	// Handle mouse up
	function handleMouseUp() {
		isDragging = false;
		isPanning = false;
		dragTableId = null;
	}

	// Handle wheel for zooming
	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const factor = e.deltaY > 0 ? 0.9 : 1.1;
		onZoom?.(factor, e.clientX, e.clientY);
	}

	// Calculate intersection point of line with table rectangle edge
	function getTableEdgePoint(
		tableX: number,
		tableY: number,
		tableWidth: number,
		tableHeight: number,
		dirX: number,
		dirY: number,
		isStart: boolean
	): { x: number; y: number } {
		const centerX = tableX + tableWidth / 2;
		const centerY = tableY + tableHeight / 2;
		const halfWidth = tableWidth / 2;
		const halfHeight = tableHeight / 2;

		// Determine which edge the line intersects
		// Calculate intersection with all four edges and pick the closest
		let edgeX = centerX;
		let edgeY = centerY;
		const margin = 15; // Margin for the marker

		// For start point, we go in the direction; for end point, we go opposite
		const d = isStart ? 1 : -1;
		const dx = dirX * d;
		const dy = dirY * d;

		// Calculate which edge is hit based on the angle
		// Time to hit vertical edges (left/right)
		const tVertical = dx !== 0 ? halfWidth / Math.abs(dx) : Infinity;
		// Time to hit horizontal edges (top/bottom)
		const tHorizontal = dy !== 0 ? halfHeight / Math.abs(dy) : Infinity;

		if (tVertical < tHorizontal) {
			// Hits vertical edge (left or right)
			edgeX = centerX + (dx > 0 ? halfWidth + margin : -halfWidth - margin);
			edgeY = centerY + dy * tVertical;
		} else {
			// Hits horizontal edge (top or bottom)
			edgeX = centerX + dx * tHorizontal;
			edgeY = centerY + (dy > 0 ? halfHeight + margin : -halfHeight - margin);
		}

		return { x: edgeX, y: edgeY };
	}

	// Calculate relation path between two tables
	function getRelationPath(relation: Relation): string {
		const fromTable = tables.find(t => t.id === relation.from.tableId);
		const toTable = tables.find(t => t.id === relation.to.tableId);

		if (!fromTable || !toTable) return '';

		// Table dimensions
		const tableWidth = 220;
		const getTableHeight = (table: Table) => (table.columns.length + 1) * 28 + 16;
		const fromHeight = getTableHeight(fromTable);
		const toHeight = getTableHeight(toTable);

		// Calculate center points
		const fromCenterX = fromTable.position.x + tableWidth / 2;
		const fromCenterY = fromTable.position.y + fromHeight / 2;
		const toCenterX = toTable.position.x + tableWidth / 2;
		const toCenterY = toTable.position.y + toHeight / 2;

		// Calculate direction vector
		const dx = toCenterX - fromCenterX;
		const dy = toCenterY - fromCenterY;
		const length = Math.sqrt(dx * dx + dy * dy);

		if (length === 0) return '';

		// Normalize direction
		const dirX = dx / length;
		const dirY = dy / length;

		// Get edge points for both tables
		const fromPoint = getTableEdgePoint(
			fromTable.position.x,
			fromTable.position.y,
			tableWidth,
			fromHeight,
			dirX,
			dirY,
			true
		);

		const toPoint = getTableEdgePoint(
			toTable.position.x,
			toTable.position.y,
			tableWidth,
			toHeight,
			dirX,
			dirY,
			false
		);

		return `M ${fromPoint.x} ${fromPoint.y} L ${toPoint.x} ${toPoint.y}`;
	}

	// Get marker IDs based on relation type
	function getMarkers(relation: Relation): { start: string, end: string } {
		switch (relation.type) {
			case 'one-to-one':
				return { start: 'url(#one-marker)', end: 'url(#one-marker)' };
			case 'one-to-many':
				return { start: 'url(#one-marker)', end: 'url(#many-marker)' };
			case 'many-to-one':
				return { start: 'url(#many-marker)', end: 'url(#one-marker)' };
			case 'many-to-many':
				return { start: 'url(#many-marker)', end: 'url(#many-marker)' };
			default:
				return { start: '', end: 'url(#one-marker)' };
		}
	}
</script>

<div class="canvas-container">
	<svg
		bind:this={svgElement}
		class="canvas"
		onmousedown={handleCanvasMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseUp}
		onwheel={handleWheel}
		style="cursor: {isPanning ? 'grabbing' : 'default'};"
	>
		<!-- Grid pattern -->
		<defs>
			<pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
				<path d="M {GRID_SIZE} 0 L 0 0 0 {GRID_SIZE}" fill="none" stroke={GRID_COLOR} stroke-width="1"/>
			</pattern>
		</defs>

		<!-- Infinite grid background -->
		<rect
			id="grid-bg"
			x="-10000"
			y="-10000"
			width="20000"
			height="20000"
			fill="url(#grid)"
			style="cursor: grab;"
		/>

		<!-- Transform group for pan/zoom -->
		<g transform={getTransform()}>
			<!-- Relations -->
			{#each relations as relation}
				{@const markers = getMarkers(relation)}
				<path
					d={getRelationPath(relation)}
					stroke="#9ca3af"
					stroke-width="2"
					fill="none"
					marker-start={markers.start}
					marker-end={markers.end}
				/>
			{/each}

			<!-- Tables -->
			{#each tables as table (table.id)}
				<TableCard
					table={table}
					selected={table.id === selectedTableId}
					onSelect={() => onSelectTable?.(table.id)}
					onDragStart={(e) => handleTableDragStart(table.id, e)}
				/>
			{/each}
		</g>

		<!-- Crow's foot notation markers for relations -->
		<defs>
			<!-- One (mandatory) - perpendicular line -->
			<marker
				id="one-marker"
				markerWidth="12"
				markerHeight="12"
				refX="6"
				refY="6"
				orient="auto"
			>
				<line x1="6" y1="2" x2="6" y2="10" stroke="#9ca3af" stroke-width="2" />
			</marker>

			<!-- Many - crow's foot -->
			<marker
				id="many-marker"
				markerWidth="16"
				markerHeight="12"
				refX="8"
				refY="6"
				orient="auto"
			>
				<path d="M 8 6 L 0 2 M 8 6 L 0 6 M 8 6 L 0 10" stroke="#9ca3af" stroke-width="2" fill="none" />
			</marker>
		</defs>
	</svg>
</div>

<style>
	.canvas-container {
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: #f9fafb;
	}

	.canvas {
		width: 100%;
		height: 100%;
	}
</style>
