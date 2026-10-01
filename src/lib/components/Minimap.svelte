<script lang="ts">
	import type { Table, ViewportState } from '$lib/types';
	import { minimapToWorld, minimapTransform, panToCenter, tableBounds, viewportBounds } from '$lib/editor/minimap-geometry';

	let { tables, viewport, width, height, onPan }: {
		tables: Table[];
		viewport: ViewportState;
		width: number;
		height: number;
		onPan?: (dx: number, dy: number) => void;
	} = $props();

	const mapWidth = 180;
	const mapHeight = 120;
	const visible = $derived(viewportBounds(viewport, width, height));
	const cards = $derived(tables.map(tableBounds));
	const transform = $derived(minimapTransform([...cards, visible], mapWidth, mapHeight));

	function navigate(event: MouseEvent) {
		event.stopPropagation();
		const bounds = event.currentTarget instanceof HTMLElement ? event.currentTarget.getBoundingClientRect() : null;
		if (!bounds || !width || !height) return;
		const point = minimapToWorld({
			x: (event.clientX - bounds.left) * mapWidth / bounds.width,
			y: (event.clientY - bounds.top) * mapHeight / bounds.height
		}, transform);
		const delta = panToCenter(point, viewport, width, height);
		onPan?.(delta.x, delta.y);
	}

	function keydown(event: KeyboardEvent) {
		event.stopPropagation();
		const directions: Record<string, [number, number]> = {
			ArrowLeft: [width / 4, 0], ArrowRight: [-width / 4, 0],
			ArrowUp: [0, height / 4], ArrowDown: [0, -height / 4]
		};
		const direction = directions[event.key];
		if (direction) {
			event.preventDefault();
			onPan?.(...direction);
		}
	}
</script>

<button
	type="button"
	class="minimap"
	aria-label="Schema minimap. Click to center the canvas; use arrow keys to pan."
	title="Click to navigate · Arrow keys to pan"
	onclick={navigate}
	onkeydown={keydown}
	onmousedown={(event) => event.stopPropagation()}
	onmousemove={(event) => event.stopPropagation()}
	onmouseup={(event) => event.stopPropagation()}
	onwheel={(event) => { event.stopPropagation(); event.preventDefault(); }}
>
	<svg viewBox="0 0 {mapWidth} {mapHeight}" aria-hidden="true">
		<g transform="translate({transform.x}, {transform.y}) scale({transform.scale})">
			{#each cards as card}
				<rect x={card.x} y={card.y} width={card.width} height={card.height} class="table" />
			{/each}
			<rect x={visible.x} y={visible.y} width={visible.width} height={visible.height}
				class="viewport" vector-effect="non-scaling-stroke" />
		</g>
	</svg>
</button>

<style>
	.minimap {
		position: absolute;
		right: 12px;
		bottom: 12px;
		width: 180px;
		max-width: calc(100% - 24px);
		padding: 0;
		border: 1px solid var(--canvas-grid);
		border-radius: 6px;
		background: var(--canvas-background);
		box-shadow: 0 2px 8px rgb(0 0 0 / 15%);
		cursor: crosshair;
		overflow: hidden;
	}
	.minimap:focus-visible { outline: 2px solid var(--canvas-edge); outline-offset: 2px; }
	svg { display: block; width: 100%; }
	.table { fill: var(--canvas-edge); opacity: 0.55; }
	.viewport { fill: var(--canvas-edge); fill-opacity: 0.08; stroke: var(--canvas-edge); stroke-width: 2; }
</style>
