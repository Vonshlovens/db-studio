<script lang="ts">
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

	// Format zoom percentage
	function formatZoom(zoom: number): string {
		return `${Math.round(zoom * 100)}%`;
	}
</script>

<div class="toolbar">
	<div class="toolbar-section">
		<button class="btn" onclick={onZoomOut} title="Zoom Out">
			<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
				<path d="M4 7h8v2H4z"/>
			</svg>
		</button>
		<span class="zoom-level">{formatZoom(viewport.zoom)}</span>
		<button class="btn" onclick={onZoomIn} title="Zoom In">
			<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
				<path d="M7 4h2v3h3v2H9v3H7V9H4V7h3z"/>
			</svg>
		</button>
	</div>

	<div class="divider"></div>

	<div class="toolbar-section">
		<button class="btn" onclick={onResetView} title="Reset View">
			<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
				<path d="M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3zm0 9a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>
				<path d="M8 5v3l2 1V8l-1-.5V5z"/>
			</svg>
		</button>
		<button
			class="btn"
			class:active={showGrid}
			onclick={onToggleGrid}
			title="Toggle Grid"
		>
			<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
				<path d="M1 2h2v2H1zm4 0h2v2H5zm4 0h2v2H9zm4 0h2v2h-2zM1 6h2v2H1zm4 0h2v2H5zm4 0h2v2H9zm4 0h2v2h-2zM1 10h2v2H1zm4 0h2v2H5zm4 0h2v2H9zm4 0h2v2h-2z"/>
			</svg>
		</button>
	</div>
</div>

<style>
	.toolbar {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 8px 12px;
		background: white;
		border-bottom: 1px solid #e5e7eb;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.toolbar-section {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.divider {
		width: 1px;
		height: 20px;
		background: #e5e7eb;
		margin: 0 4px;
	}

	.btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		border-radius: 6px;
		cursor: pointer;
		color: #4b5563;
		transition: all 0.15s ease;
	}

	.btn:hover {
		background: #f3f4f6;
		color: #111827;
	}

	.btn.active {
		background: #eff6ff;
		color: #3b82f6;
	}

	.zoom-level {
		min-width: 50px;
		text-align: center;
		font-size: 13px;
		font-weight: 500;
		color: #374151;
	}
</style>
