<script lang="ts">
	import { clientToLocal, snapPositionToGrid } from '$lib/editor/canvas-geometry';
	import { getRelationRoute } from '$lib/editor/relation-routing';
	import type { Table, Relation, Position, ViewportState } from '$lib/types';
	import TableCard from './TableCard.svelte';

	interface Props {
		tables: Table[];
		relations: Relation[];
		viewport: ViewportState;
		showGrid?: boolean;
		gridSize?: number;
		snapToGrid?: boolean;
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
		showGrid = true,
		gridSize = 20,
		snapToGrid = false,
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
	let dragPosition: Position | null = $state(null);
	let dragMoved = $state(false);

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
		dragPosition = { ...table.position };
		dragMoved = false;
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
			dragPosition = {
				x: worldPos.x - dragOffset.x,
				y: worldPos.y - dragOffset.y
			};
			dragMoved = true;
			onTableMove?.(dragTableId, dragPosition);
		}
	}

	// Handle mouse up
	function handleMouseUp() {
		if (isDragging && dragMoved && dragTableId && dragPosition && snapToGrid) {
			const snappedPosition = snapPositionToGrid(dragPosition, gridSize);
			if (snappedPosition.x !== dragPosition.x || snappedPosition.y !== dragPosition.y) {
				onTableMove?.(dragTableId, snappedPosition);
			}
		}

		isDragging = false;
		isPanning = false;
		dragTableId = null;
		dragPosition = null;
		dragMoved = false;
	}

	// Handle wheel for zooming
	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const factor = e.deltaY > 0 ? 0.9 : 1.1;
		const localPoint = clientToLocal(e.clientX, e.clientY, svgElement.getBoundingClientRect());
		onZoom?.(factor, localPoint.x, localPoint.y);
	}

	const relationDrawings = $derived.by(() => {
		void tables.map((table) => [table.id, table.position.x, table.position.y, table.columns.length]);
		return relations.flatMap((relation) => {
			const route = getRelationRoute(relation, tables);
			return route ? [{ relation, route }] : [];
		});
	});

	function relationLabel(relation: Relation): string {
		const from = tables.find((table) => table.id === relation.from.tableId)?.name ?? 'Unknown table';
		const to = tables.find((table) => table.id === relation.to.tableId)?.name ?? 'Unknown table';
		return `${from} to ${to}`;
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_no_noninteractive_tabindex -->
<div
	class="canvas-container"
	onmousedown={handleCanvasMouseDown}
	onmousemove={handleMouseMove}
	onmouseup={handleMouseUp}
	onmouseleave={handleMouseUp}
	onwheel={handleWheel}
	role="application"
	aria-label="Database diagram canvas"
>
	<svg
		bind:this={svgElement}
		class="canvas"
		style="cursor: {isPanning ? 'grabbing' : 'default'};"
	>
		<!-- Grid pattern -->
		<defs>
			<pattern
				id="grid"
				width={gridSize}
				height={gridSize}
				patternUnits="userSpaceOnUse"
				patternTransform={getTransform()}
			>
				<path
					d="M {gridSize} 0 L 0 0 0 {gridSize}"
					fill="none"
					stroke="var(--canvas-grid)"
					stroke-width="1"
				/>
			</pattern>
		</defs>

		<!-- Infinite grid background -->
		<rect
			id="grid-bg"
			x="0"
			y="0"
			width="100%"
			height="100%"
			fill={showGrid ? 'url(#grid)' : 'var(--canvas-background)'}
			style="cursor: grab;"
		/>

		<!-- Transform group for pan/zoom -->
		<g transform={getTransform()}>
			<!-- Relations -->
			{#each relationDrawings as { relation, route } (relation.id)}
				<g class="relation" aria-label={relationLabel(relation)}>
					<path
						d={route.path}
						stroke="var(--canvas-edge)"
						stroke-width="2"
						stroke-linejoin="round"
						stroke-linecap="round"
						fill="none"
					>
						<title>{relationLabel(relation)}</title>
					</path>
					{#each route.marks as mark, markIndex (`${relation.id}-mark-${markIndex}`)}
						<path
							d={mark}
							stroke="var(--canvas-edge)"
							stroke-width="2"
							stroke-linecap="round"
							fill="none"
						/>
					{/each}
				</g>
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
	</svg>
</div>

<style>
	.canvas-container {
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: var(--canvas-background);
	}

	.canvas {
		width: 100%;
		height: 100%;
	}
</style>
