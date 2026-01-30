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

	// Table dimensions constants
	const TABLE_WIDTH = 220;
	const MARGIN = 20; // Distance from table edge before first bend

	// Get table height based on columns
	function getTableHeight(table: Table): number {
		return (table.columns.length + 1) * 28 + 16;
	}

	// Get table bounding box
	function getTableBounds(table: Table): { left: number; right: number; top: number; bottom: number; centerX: number; centerY: number } {
		const height = getTableHeight(table);
		return {
			left: table.position.x,
			right: table.position.x + TABLE_WIDTH,
			top: table.position.y,
			bottom: table.position.y + height,
			centerX: table.position.x + TABLE_WIDTH / 2,
			centerY: table.position.y + height / 2
		};
	}

	// Determine the best edge to connect from based on relative positions
	type Edge = 'left' | 'right' | 'top' | 'bottom';

	function getBestEdges(fromBounds: ReturnType<typeof getTableBounds>, toBounds: ReturnType<typeof getTableBounds>): { fromEdge: Edge; toEdge: Edge } {
		const dx = toBounds.centerX - fromBounds.centerX;
		const dy = toBounds.centerY - fromBounds.centerY;

		// Check for horizontal separation (tables side by side)
		const horizontalGap = Math.abs(dx) - TABLE_WIDTH;
		// Check for vertical separation (tables above/below)
		const verticalGap = Math.abs(dy) - (fromBounds.bottom - fromBounds.top + toBounds.bottom - toBounds.top) / 2;

		// Prefer horizontal connections if there's clear horizontal separation
		if (horizontalGap > 0 && horizontalGap > verticalGap) {
			if (dx > 0) {
				return { fromEdge: 'right', toEdge: 'left' };
			} else {
				return { fromEdge: 'left', toEdge: 'right' };
			}
		}

		// Prefer vertical connections if there's clear vertical separation
		if (verticalGap > 0) {
			if (dy > 0) {
				return { fromEdge: 'bottom', toEdge: 'top' };
			} else {
				return { fromEdge: 'top', toEdge: 'bottom' };
			}
		}

		// Tables overlap somewhat - use the larger delta
		if (Math.abs(dx) > Math.abs(dy)) {
			if (dx > 0) {
				return { fromEdge: 'right', toEdge: 'left' };
			} else {
				return { fromEdge: 'left', toEdge: 'right' };
			}
		} else {
			if (dy > 0) {
				return { fromEdge: 'bottom', toEdge: 'top' };
			} else {
				return { fromEdge: 'top', toEdge: 'bottom' };
			}
		}
	}

	// Get anchor point on table edge
	function getAnchorPoint(bounds: ReturnType<typeof getTableBounds>, edge: Edge): { x: number; y: number } {
		switch (edge) {
			case 'left':
				return { x: bounds.left - MARGIN, y: bounds.centerY };
			case 'right':
				return { x: bounds.right + MARGIN, y: bounds.centerY };
			case 'top':
				return { x: bounds.centerX, y: bounds.top - MARGIN };
			case 'bottom':
				return { x: bounds.centerX, y: bounds.bottom + MARGIN };
		}
	}

	// Calculate orthogonal path between two tables
	function getRelationPath(relation: Relation): string {
		const fromTable = tables.find(t => t.id === relation.from.tableId);
		const toTable = tables.find(t => t.id === relation.to.tableId);

		if (!fromTable || !toTable) return '';

		const fromBounds = getTableBounds(fromTable);
		const toBounds = getTableBounds(toTable);

		// Determine which edges to connect
		const { fromEdge, toEdge } = getBestEdges(fromBounds, toBounds);

		// Get anchor points
		const fromPoint = getAnchorPoint(fromBounds, fromEdge);
		const toPoint = getAnchorPoint(toBounds, toEdge);

		// Build orthogonal path based on edge combinations
		// The path always starts horizontal or vertical from the edge, then bends once
		const isFromHorizontal = fromEdge === 'left' || fromEdge === 'right';
		const isToHorizontal = toEdge === 'left' || toEdge === 'right';

		let path = `M ${fromPoint.x} ${fromPoint.y}`;

		if (isFromHorizontal && isToHorizontal) {
			// Both horizontal edges - route with vertical middle segment
			const midX = (fromPoint.x + toPoint.x) / 2;
			path += ` H ${midX} V ${toPoint.y} H ${toPoint.x}`;
		} else if (!isFromHorizontal && !isToHorizontal) {
			// Both vertical edges - route with horizontal middle segment
			const midY = (fromPoint.y + toPoint.y) / 2;
			path += ` V ${midY} H ${toPoint.x} V ${toPoint.y}`;
		} else if (isFromHorizontal && !isToHorizontal) {
			// From horizontal, to vertical - single bend
			path += ` H ${toPoint.x} V ${toPoint.y}`;
		} else {
			// From vertical, to horizontal - single bend
			path += ` V ${toPoint.y} H ${toPoint.x}`;
		}

		return path;
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
