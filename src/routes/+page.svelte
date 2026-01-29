<script lang="ts">
	import { schemaStore } from '$lib/stores/schema.svelte';
	import { sampleSchema } from '$lib/data/sample';
	import { parseDBML, generateDBML } from '$lib/dbml';
	import Canvas from '$lib/components/Canvas.svelte';
	import Toolbar from '$lib/components/Toolbar.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';

	// Initialize with sample data
	$effect(() => {
		if (schemaStore.schema.tables.length === 0) {
			schemaStore.setSchema(sampleSchema);
		}
	});

	// State for import/export modal
	let showModal = $state(false);
	let modalMode: 'import' | 'export' = $state('import');
	let modalText = $state('');
	let parseErrors = $state<string[]>([]);

	// Handle actions
	function handleImport() {
		modalMode = 'import';
		modalText = '';
		parseErrors = [];
		showModal = true;
	}

	function handleExport() {
		modalMode = 'export';
		modalText = generateDBML(schemaStore.schema);
		parseErrors = [];
		showModal = true;
	}

	function handleImportConfirm() {
		const result = parseDBML(modalText);
		if (result.schema) {
			schemaStore.importParseResult(result);
			showModal = false;
		} else {
			parseErrors = result.errors.map(e => `Line ${e.line}: ${e.message}`);
		}
	}

	function handleAddTable() {
		const newTable = {
			id: `table_${Date.now()}`,
			name: `new_table_${schemaStore.schema.tables.length + 1}`,
			columns: [
				{ id: `col_${Date.now()}`, name: 'id', type: 'int', constraints: { pk: true, increment: true } }
			],
			indexes: [],
			position: { x: 100, y: 100 }
		};
		schemaStore.addTable(newTable);
	}
</script>

<div class="app">
	<header class="header">
		<h1 class="logo">DB Studio</h1>
	</header>

	<div class="main">
		<Sidebar
			schema={schemaStore.schema}
			selectedTableId={schemaStore.ui.selectedTableId}
			onSelectTable={(id) => schemaStore.selectTable(id)}
			onAddTable={handleAddTable}
			onImportDBML={handleImport}
			onExportDBML={handleExport}
		/>

		<div class="workspace">
			<Toolbar
				viewport={schemaStore.viewport}
				showGrid={schemaStore.layout.showGrid}
				onZoomIn={() => schemaStore.zoom(1.2)}
				onZoomOut={() => schemaStore.zoom(0.8)}
				onResetView={() => schemaStore.resetViewport()}
				onToggleGrid={() => schemaStore.toggleGrid()}
			/>

			<div class="canvas-wrapper">
				<Canvas
					tables={schemaStore.schema.tables}
					relations={schemaStore.schema.relations}
					viewport={schemaStore.viewport}
					selectedTableId={schemaStore.ui.selectedTableId}
					onPan={(dx, dy) => schemaStore.pan(dx, dy)}
					onZoom={(factor, cx, cy) => schemaStore.zoom(factor, cx, cy)}
					onSelectTable={(id) => schemaStore.selectTable(id)}
					onTableMove={(id, pos) => schemaStore.moveTable(id, pos)}
				/>
			</div>
		</div>
	</div>
</div>

<!-- Import/Export Modal -->
{#if showModal}
	<div class="modal-overlay" onclick={() => showModal = false}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>{modalMode === 'import' ? 'Import DBML' : 'Export DBML'}</h2>
				<button class="close-btn" onclick={() => showModal = false}>×</button>
			</div>

			<div class="modal-body">
				<textarea
					class="dbml-textarea"
					value={modalText}
					oninput={(e) => modalText = e.currentTarget.value}
					readonly={modalMode === 'export'}
					placeholder="Paste DBML here..."
				></textarea>

				{#if parseErrors.length > 0}
					<div class="errors">
						{#each parseErrors as error}
							<div class="error">{error}</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="modal-footer">
				{#if modalMode === 'import'}
					<button class="btn btn-primary" onclick={handleImportConfirm}>
						Import
					</button>
				{:else}
					<button
						class="btn btn-primary"
						onclick={() => navigator.clipboard.writeText(modalText)}
					>
						Copy to Clipboard
					</button>
				{/if}
				<button class="btn btn-secondary" onclick={() => showModal = false}>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	}

	.app {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	.header {
		height: 48px;
		background: #1f2937;
		color: white;
		display: flex;
		align-items: center;
		padding: 0 16px;
		flex-shrink: 0;
	}

	.logo {
		font-size: 18px;
		font-weight: 600;
		margin: 0;
	}

	.main {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.workspace {
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: hidden;
	}

	.canvas-wrapper {
		flex: 1;
		overflow: hidden;
		position: relative;
	}

	/* Modal Styles */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.modal {
		background: white;
		border-radius: 8px;
		width: 600px;
		max-width: 90vw;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 18px;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 24px;
		color: #6b7280;
		cursor: pointer;
	}

	.modal-body {
		padding: 16px;
		flex: 1;
		overflow: auto;
	}

	.dbml-textarea {
		width: 100%;
		height: 300px;
		font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
		font-size: 13px;
		padding: 12px;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		resize: none;
	}

	.errors {
		margin-top: 12px;
		padding: 12px;
		background: #fef2f2;
		border-radius: 6px;
	}

	.error {
		color: #dc2626;
		font-size: 13px;
		margin-bottom: 4px;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 16px;
		border-top: 1px solid #e5e7eb;
	}

	.btn {
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
		border: none;
	}

	.btn-primary:hover {
		background: #2563eb;
	}

	.btn-secondary {
		background: white;
		color: #374151;
		border: 1px solid #e5e7eb;
	}

	.btn-secondary:hover {
		background: #f9fafb;
		border-color: #d1d5db;
	}
</style>
