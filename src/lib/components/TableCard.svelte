<script lang="ts">
	import {
		getTableHeight,
		TABLE_COLUMN_HEIGHT,
		TABLE_COLUMN_START_Y,
		TABLE_HEADER_HEIGHT,
		TABLE_WIDTH
	} from '$lib/editor/table-geometry';
	import type { Table } from '$lib/types';

	interface Props {
		table: Table;
		selected?: boolean;
		onSelect?: () => void;
		onDragStart?: (e: MouseEvent) => void;
	}

	let { table, selected = false, onSelect, onDragStart }: Props = $props();

	function handleMouseDown(e: MouseEvent) {
		if (e.button === 0) {
			// Left click
			onSelect?.();
			onDragStart?.(e);
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onSelect?.();
		}
	}

	// Get constraint icons for a column
	function getConstraintIcons(column: Table['columns'][0]): string {
		const icons: string[] = [];
		if (column.constraints.pk) icons.push('PK');
		if (column.constraints.unique) icons.push('U');
		if (column.constraints.notNull) icons.push('NN');
		if (column.constraints.fk) icons.push('FK');
		return icons.join(' ');
	}
</script>

<g
	transform="translate({table.position.x}, {table.position.y})"
	class:table-selected={selected}
	style="cursor: move;"
	onmousedown={handleMouseDown}
	onkeydown={handleKeyDown}
	role="button"
	tabindex="0"
	aria-label={`Select and move table ${table.name}`}
>
	<!-- Table background -->
	<rect
		x="0"
		y="0"
		width={TABLE_WIDTH}
		height={getTableHeight(table.columns.length)}
		fill="var(--canvas-card)"
		stroke={selected ? 'var(--ring)' : table.color ?? 'var(--border)'}
		stroke-width={selected ? '2' : '1'}
		rx="6"
	/>

	<!-- Table header -->
	<rect
		x="0"
		y="0"
		width={TABLE_WIDTH}
		height={TABLE_HEADER_HEIGHT}
		fill={selected
			? 'var(--canvas-card-selected)'
			: table.color
				? `color-mix(in oklab, ${table.color} 18%, var(--canvas-card-header))`
				: 'var(--canvas-card-header)'}
		stroke={selected ? 'var(--ring)' : table.color ?? 'var(--border)'}
		stroke-width={selected ? '2' : '1'}
		rx="6"
	/>

	<!-- Table name -->
	<text
		x={TABLE_WIDTH / 2}
		y="24"
		text-anchor="middle"
		font-weight="600"
		font-size="14"
		fill="var(--canvas-text)"
		pointer-events="none"
	>
		{table.name}
	</text>

	<!-- Columns -->
	{#each table.columns as column, i}
		<g transform="translate(8, {TABLE_COLUMN_START_Y + i * TABLE_COLUMN_HEIGHT})">
			<!-- Key icons -->
			<text
				x="0"
				y="18"
				font-size="10"
				fill="var(--canvas-muted)"
				font-weight="500"
			>
				{getConstraintIcons(column)}
			</text>

			<!-- Column name -->
			<text
				x="50"
				y="18"
				font-size="12"
				fill="var(--canvas-text)"
				font-weight={column.constraints.pk ? '600' : 'normal'}
			>
				{column.name}
			</text>

			<!-- Column type -->
			<text
				x="160"
				y="18"
				font-size="11"
				fill="var(--canvas-muted)"
				text-anchor="end"
			>
				{column.type}
			</text>
		</g>
	{/each}
</g>

<style>
	g {
		transition: filter 0.15s ease;
	}

	g:hover {
		filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
	}

	.table-selected {
		filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.3));
	}
</style>
