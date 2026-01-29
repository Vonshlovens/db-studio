<script lang="ts">
	import type { Table } from '$lib/types';

	interface Props {
		table: Table;
		selected?: boolean;
		onSelect?: () => void;
		onDragStart?: () => void;
	}

	let { table, selected = false, onSelect, onDragStart }: Props = $props();

	function handleMouseDown(e: MouseEvent) {
		if (e.button === 0) {
			// Left click
			onSelect?.();
			onDragStart?.();
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
>
	<!-- Table background -->
	<rect
		x="0"
		y="0"
		width="220"
		height="{(table.columns.length + 1) * 28 + 16}"
		fill="white"
		stroke={selected ? '#3b82f6' : '#e5e7eb'}
		stroke-width={selected ? '2' : '1'}
		rx="6"
		onmousedown={handleMouseDown}
	/>

	<!-- Table header -->
	<rect
		x="0"
		y="0"
		width="220"
		height="36"
		fill={selected ? '#eff6ff' : '#f9fafb'}
		stroke={selected ? '#3b82f6' : '#e5e7eb'}
		stroke-width={selected ? '2' : '1'}
		rx="6"
		onmousedown={handleMouseDown}
	/>

	<!-- Table name -->
	<text
		x="110"
		y="24"
		text-anchor="middle"
		font-weight="600"
		font-size="14"
		fill="#111827"
		pointer-events="none"
	>
		{table.name}
	</text>

	<!-- Columns -->
	{#each table.columns as column, i}
		<g transform="translate(8, {44 + i * 28})">
			<!-- Key icons -->
			<text
				x="0"
				y="18"
				font-size="10"
				fill="#6b7280"
				font-weight="500"
			>
				{getConstraintIcons(column)}
			</text>

			<!-- Column name -->
			<text
				x="50"
				y="18"
				font-size="12"
				fill="#374151"
				font-weight={column.constraints.pk ? '600' : 'normal'}
			>
				{column.name}
			</text>

			<!-- Column type -->
			<text
				x="160"
				y="18"
				font-size="11"
				fill="#9ca3af"
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
