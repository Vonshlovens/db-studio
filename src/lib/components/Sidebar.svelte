<script lang="ts">
	import type { Schema, Table } from '$lib/types';

	interface Props {
		schema: Schema;
		selectedTableId: string | null;
		onSelectTable?: (tableId: string) => void;
		onAddTable?: () => void;
		onImportDBML?: () => void;
		onExportDBML?: () => void;
	}

	let {
		schema,
		selectedTableId,
		onSelectTable,
		onAddTable,
		onImportDBML,
		onExportDBML
	}: Props = $props();
</script>

<aside class="sidebar">
	<div class="section">
		<h3 class="section-title">Actions</h3>
		<div class="button-group">
			<button class="btn btn-primary" onclick={onAddTable}>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
					<path d="M8 4v8M4 8h8"/>
				</svg>
				Add Table
			</button>
			<button class="btn btn-secondary" onclick={onImportDBML}>
				Import DBML
			</button>
			<button class="btn btn-secondary" onclick={onExportDBML}>
				Export DBML
			</button>
		</div>
	</div>

	<div class="section">
		<h3 class="section-title">Tables ({schema.tables.length})</h3>
		<div class="table-list">
			{#each schema.tables as table}
				<button
					class="table-item"
					class:selected={table.id === selectedTableId}
					onclick={() => onSelectTable?.(table.id)}
				>
					<span class="table-icon">⊞</span>
					<span class="table-name">{table.name}</span>
					<span class="table-columns">{table.columns.length}</span>
				</button>
			{/each}
		</div>
	</div>

	{#if schema.relations.length > 0}
		<div class="section">
			<h3 class="section-title">Relations ({schema.relations.length})</h3>
			<div class="relation-list">
				{#each schema.relations as relation}
					<div class="relation-item">
						<span class="relation-from">{relation.from.tableId}</span>
						<span class="relation-arrow">→</span>
						<span class="relation-to">{relation.to.tableId}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</aside>

<style>
	.sidebar {
		width: 260px;
		background: white;
		border-right: 1px solid #e5e7eb;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
	}

	.section {
		padding: 16px;
		border-bottom: 1px solid #e5e7eb;
	}

	.section-title {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #6b7280;
		margin: 0 0 12px 0;
	}

	.button-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 8px 12px;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
		border-color: #3b82f6;
	}

	.btn-primary:hover {
		background: #2563eb;
	}

	.btn-secondary {
		background: white;
		color: #374151;
	}

	.btn-secondary:hover {
		background: #f9fafb;
		border-color: #d1d5db;
	}

	.table-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.table-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		border: none;
		background: transparent;
		border-radius: 6px;
		cursor: pointer;
		font-size: 13px;
		text-align: left;
		transition: all 0.15s ease;
	}

	.table-item:hover {
		background: #f3f4f6;
	}

	.table-item.selected {
		background: #eff6ff;
		color: #3b82f6;
	}

	.table-icon {
		color: #9ca3af;
	}

	.table-name {
		flex: 1;
	}

	.table-columns {
		font-size: 11px;
		color: #9ca3af;
		background: #f3f4f6;
		padding: 2px 6px;
		border-radius: 4px;
	}

	.relation-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.relation-item {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: #4b5563;
	}

	.relation-arrow {
		color: #9ca3af;
	}
</style>
