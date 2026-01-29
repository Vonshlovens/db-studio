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
	function handleTableDragStart(tableId: string) {
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
			onTableMove?.(dragTableId, { x: worldPos.x, y: worldPos.y });
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

	// Calculate relation path between two tables
	function getRelationPath(relation: Relation): string {
		const fromTable = tables.find(t => t.id === relation.from.tableId);
		const toTable = tables.find(t => t.id === relation.to.tableId);

		if (!fromTable || !toTable) return '';

		// Simple center-to-center connection for now
		const fromX = fromTable.position.x + 110; // Center of table
		const fromY = fromTable.position.y + 36 + (fromTable.columns.length * 28) / 2;
		const toX = toTable.position.x + 110;
		const toY = toTable.position.y + 36 + (toTable.columns.length * 28) / 2;

		// Simple straight line for now (can be replaced with bezier curves)
		return `M ${fromX} ${fromY} L ${toX} ${toY}`;
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
				<path
					d={getRelationPath(relation)}
					stroke="#9ca3af"
					stroke-width="2"
					fill="none"
					marker-end="url(#arrowhead)"
				/>
			{/each}

			<!-- Tables -->
			{#each tables as table (table.id)}
				<TableCard
					table={table}
					selected={table.id === selectedTableId}
					onSelect={() => onSelectTable?.(table.id)}
					onDragStart={() => handleTableDragStart(table.id)}
				/>
			{/each}
		</g>

		<!-- Arrow marker for relations -->
		<defs>
			<marker
				id="arrowhead"
				markerWidth="10"
				markerHeight="7"
				refX="9"
				refY="3.5"
				orient="auto"
			>
				<polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
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
