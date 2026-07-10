<script lang="ts">
	import { Grid3X3, LocateFixed, Minus, Plus } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import type { ViewportState } from '$lib/types';

	interface Props {
		viewport: ViewportState;
		onZoomIn?: () => void;
		onZoomOut?: () => void;
		onResetView?: () => void;
		onToggleGrid?: () => void;
		showGrid?: boolean;
	}

	let {
		viewport,
		onZoomIn,
		onZoomOut,
		onResetView,
		onToggleGrid,
		showGrid = true
	}: Props = $props();
</script>

<div class="flex h-12 items-center gap-1 border-b bg-background px-3 shadow-xs">
	<Button variant="ghost" size="icon-sm" onclick={onZoomOut} aria-label="Zoom out" title="Zoom out">
		<Minus />
	</Button>
	<span class="min-w-14 text-center text-xs font-medium text-muted-foreground">
		{Math.round(viewport.zoom * 100)}%
	</span>
	<Button variant="ghost" size="icon-sm" onclick={onZoomIn} aria-label="Zoom in" title="Zoom in">
		<Plus />
	</Button>

	<Separator orientation="vertical" class="mx-2 h-5!" />

	<Button
		variant="ghost"
		size="icon-sm"
		onclick={onResetView}
		aria-label="Reset viewport"
		title="Reset viewport"
	>
		<LocateFixed />
	</Button>
	<Button
		variant={showGrid ? 'secondary' : 'ghost'}
		size="icon-sm"
		onclick={onToggleGrid}
		aria-label={showGrid ? 'Hide grid' : 'Show grid'}
		title={showGrid ? 'Hide grid' : 'Show grid'}
		aria-pressed={showGrid}
	>
		<Grid3X3 />
	</Button>
</div>
