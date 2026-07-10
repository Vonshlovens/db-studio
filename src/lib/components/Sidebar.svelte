<script lang="ts">
	import { Download, FileInput, Plus, Table2, Waypoints } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import type { RelationEndpoint, Schema } from '$lib/types';

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

	function endpointLabel(endpoint: RelationEndpoint): string {
		const table = schema.tables.find((candidate) => candidate.id === endpoint.tableId);
		const column = table?.columns.find((candidate) => candidate.id === endpoint.columnId);
		return `${table?.name ?? 'Unknown table'}.${column?.name ?? 'unknown column'}`;
	}
</script>

<aside class="hidden w-64 shrink-0 flex-col overflow-y-auto border-r bg-sidebar text-sidebar-foreground md:flex">
	<div class="space-y-2 p-4">
		<Button class="w-full justify-start" onclick={onAddTable}>
			<Plus data-icon="inline-start" />
			Add table
		</Button>
		<Button variant="outline" class="w-full justify-start" onclick={onImportDBML}>
			<FileInput data-icon="inline-start" />
			Import DBML
		</Button>
		<Button variant="ghost" class="w-full justify-start" onclick={onExportDBML}>
			<Download data-icon="inline-start" />
			Export DBML
		</Button>
	</div>

	<Separator />

	<div class="p-3">
		<div class="mb-2 flex items-center justify-between px-2">
			<h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tables</h2>
			<span class="text-xs tabular-nums text-muted-foreground">{schema.tables.length}</span>
		</div>

		{#if schema.tables.length === 0}
			<div class="rounded-lg border border-dashed p-4 text-center">
				<Table2 class="mx-auto mb-2 size-5 text-muted-foreground" />
				<p class="text-sm font-medium">Empty schema</p>
				<p class="mt-1 text-xs leading-5 text-muted-foreground">Import DBML or add your first table.</p>
				<Button variant="link" size="sm" class="mt-1" onclick={onImportDBML}>Import DBML</Button>
			</div>
		{:else}
			<div class="space-y-1">
				{#each schema.tables as table (table.id)}
					<Button
						variant={table.id === selectedTableId ? 'secondary' : 'ghost'}
						class="h-auto w-full justify-start px-2.5 py-2"
						onclick={() => onSelectTable?.(table.id)}
					>
						<Table2 class="text-muted-foreground" />
						<span class="min-w-0 flex-1 truncate text-left">{table.name}</span>
						<span class="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
							{table.columns.length}
						</span>
					</Button>
				{/each}
			</div>
		{/if}
	</div>

	{#if schema.relations.length > 0}
		<Separator />
		<div class="p-3">
			<div class="mb-3 flex items-center justify-between px-2">
				<h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Relations</h2>
				<span class="text-xs tabular-nums text-muted-foreground">{schema.relations.length}</span>
			</div>
			<div class="space-y-3 px-2">
				{#each schema.relations as relation (relation.id)}
					<div class="flex min-w-0 items-start gap-2 text-xs">
						<Waypoints class="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
						<div class="min-w-0">
							<p class="truncate font-medium" title={endpointLabel(relation.from)}>
								{endpointLabel(relation.from)}
							</p>
							<p class="truncate text-muted-foreground" title={endpointLabel(relation.to)}>
								→ {endpointLabel(relation.to)}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</aside>
