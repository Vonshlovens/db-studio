<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		AlertCircle,
		ArrowLeft,
		Check,
		Clipboard,
		Database,
		Download,
		FileInput,
		LoaderCircle,
		Save,
		Upload
	} from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { getDiagram, updateDiagram } from '$lib/api/diagrams';
	import Canvas from '$lib/components/Canvas.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import Toolbar from '$lib/components/Toolbar.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { generateDBML, parseDBML } from '$lib/dbml';
	import {
		GenerationGuard,
		SaveCoordinator,
		type SaveAttemptResult
	} from '$lib/editor/async-control';
	import { schemaStore } from '$lib/stores/schema.svelte';
	import type { Table } from '$lib/types';

	type LoadState = 'loading' | 'loaded' | 'error';
	type SaveState = 'saved' | 'dirty' | 'saving' | 'error';
	interface EditorSession {
		id: string;
		generation: number;
		saves: SaveCoordinator;
	}

	const diagramId = $derived(page.params.id ?? '');
	let loadState = $state<LoadState>('loading');
	let loadError = $state('');
	let diagramName = $state('');
	let hydrated = $state(false);
	let dirty = $state(false);
	let saveState = $state<SaveState>('saved');
	let saveError = $state('');
	let lastSavedFingerprint = $state('');
	let observedFingerprint = $state('');
	let autosaveTimer: ReturnType<typeof setTimeout> | undefined;
	const loadGenerations = new GenerationGuard();
	let currentSession: EditorSession | null = null;
	let allowNavigation = false;
	let leaveDialogOpen = $state(false);
	let pendingDestination = '/';

	let dbmlOpen = $state(false);
	let dbmlMode = $state<'import' | 'export'>('import');
	let dbmlText = $state('');
	let dbmlErrors = $state<string[]>([]);
	let copyFeedback = $state('Copy to clipboard');

	$effect(() => {
		if (!hydrated) return;
		const fingerprint = currentFingerprint();
		if (fingerprint === observedFingerprint) return;

		observedFingerprint = fingerprint;
		dirty = fingerprint !== lastSavedFingerprint;
		if (dirty) {
			saveState = 'dirty';
			saveError = '';
			scheduleAutosave();
		} else if (saveState !== 'saving') {
			saveState = 'saved';
		}
	});

	$effect(() => {
		void loadDiagram(diagramId);
	});

	beforeNavigate(({ cancel, to }) => {
		if (!needsSaveBeforeNavigation() || allowNavigation || !to) return;
		cancel();
		pendingDestination = to.url.href;
		leaveDialogOpen = true;
	});

	onMount(() => {
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (!needsSaveBeforeNavigation()) return;
			event.preventDefault();
			event.returnValue = '';
		};
		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			loadGenerations.begin();
			currentSession = null;
			hydrated = false;
			clearAutosave();
			window.removeEventListener('beforeunload', handleBeforeUnload);
			schemaStore.clearSchema();
		};
	});

	function currentFingerprint(): string {
		return JSON.stringify({
			name: diagramName,
			...schemaStore.getPersistenceSnapshot()
		});
	}

	function hasUnsavedChanges(): boolean {
		return hydrated && currentFingerprint() !== lastSavedFingerprint;
	}

	function needsSaveBeforeNavigation(): boolean {
		return hasUnsavedChanges() || currentSession?.saves.isSaving === true;
	}

	function isCurrentSession(session: EditorSession): boolean {
		return (
			currentSession === session &&
			loadGenerations.isCurrent(session.generation) &&
			diagramId === session.id
		);
	}

	async function loadDiagram(id: string) {
		const generation = loadGenerations.begin();
		let session: EditorSession;
		const saves = new SaveCoordinator(() => performSave(session));
		session = { id, generation, saves };
		currentSession = session;

		loadState = 'loading';
		loadError = '';
		hydrated = false;
		dirty = false;
		saveState = 'saved';
		saveError = '';
		diagramName = '';
		lastSavedFingerprint = '';
		observedFingerprint = '';
		allowNavigation = false;
		leaveDialogOpen = false;
		clearAutosave();
		schemaStore.clearSchema();

		try {
			const diagram = await getDiagram(id);
			if (!isCurrentSession(session)) return;

			diagramName = diagram.name;
			schemaStore.loadPersistedState(diagram.schema, diagram.layout);
			lastSavedFingerprint = currentFingerprint();
			observedFingerprint = lastSavedFingerprint;
			dirty = false;
			saveState = 'saved';
			hydrated = true;
			loadState = 'loaded';
		} catch (error) {
			if (!isCurrentSession(session)) return;
			loadError = error instanceof Error ? error.message : 'Could not load this diagram.';
			loadState = 'error';
		}
	}

	function scheduleAutosave() {
		clearAutosave();
		const session = currentSession;
		autosaveTimer = setTimeout(() => {
			if (session && isCurrentSession(session)) void saveDiagram(false, session);
		}, 1200);
	}

	function clearAutosave() {
		if (autosaveTimer) {
			clearTimeout(autosaveTimer);
			autosaveTimer = undefined;
		}
	}

	async function performSave(session: EditorSession): Promise<SaveAttemptResult> {
		if (!hydrated || !isCurrentSession(session)) return 'stale';
		if (currentFingerprint() === lastSavedFingerprint) {
			dirty = false;
			saveState = 'saved';
			return 'saved';
		}

		const name = diagramName.trim();
		if (!name) {
			saveState = 'error';
			saveError = 'Diagram name cannot be empty.';
			return 'failed';
		}

		clearAutosave();
		saveState = 'saving';
		saveError = '';
		const snapshot = schemaStore.getPersistenceSnapshot();
		const submittedName = diagramName;
		const requestFingerprint = JSON.stringify({ name, ...snapshot });

		try {
			const updated = await updateDiagram(session.id, { name, ...snapshot });
			if (!isCurrentSession(session)) return 'stale';

			if (diagramName === submittedName) diagramName = updated.name;
			lastSavedFingerprint = requestFingerprint;
			observedFingerprint = currentFingerprint();
			dirty = observedFingerprint !== lastSavedFingerprint;
			saveState = dirty ? 'dirty' : 'saved';
			if (dirty) scheduleAutosave();
			return dirty ? 'dirty' : 'saved';
		} catch (error) {
			if (!isCurrentSession(session)) return 'stale';

			dirty = true;
			saveState = 'error';
			saveError = error instanceof Error ? error.message : 'Could not save your changes.';
			return 'failed';
		}
	}

	function saveDiagram(
		ensureCurrent = false,
		session = currentSession
	): Promise<boolean> {
		if (!session || !isCurrentSession(session)) return Promise.resolve(false);
		return session.saves.request(ensureCurrent);
	}

	async function goToLibrary() {
		const session = currentSession;
		if (!session) return;

		pendingDestination = '/';
		if (needsSaveBeforeNavigation() && !(await saveDiagram(true, session))) {
			if (session !== currentSession) return;
			leaveDialogOpen = true;
			return;
		}
		if (session === currentSession) await navigateToPendingDestination(session);
	}

	async function saveAndLeave() {
		const session = currentSession;
		if (!session) return;

		if (await saveDiagram(true, session)) {
			if (session === currentSession) await navigateToPendingDestination(session);
		} else if (session === currentSession) {
			leaveDialogOpen = true;
		}
	}

	async function navigateToPendingDestination(session: EditorSession) {
		if (!isCurrentSession(session) || hasUnsavedChanges()) return;

		allowNavigation = true;
		leaveDialogOpen = false;
		const destination = new URL(pendingDestination, window.location.href);
		if (destination.origin === window.location.origin) {
			await goto(destination.pathname + destination.search + destination.hash);
		} else {
			window.location.assign(destination.href);
		}
	}

	function discardAndLeave() {
		allowNavigation = true;
		hydrated = false;
		leaveDialogOpen = false;
		const destination = new URL(pendingDestination, window.location.href);
		if (destination.origin === window.location.origin) {
			void goto(destination.pathname + destination.search + destination.hash);
		} else {
			window.location.assign(destination.href);
		}
	}

	function addTable() {
		const token = crypto.randomUUID();
		const index = schemaStore.tables.length;
		const table: Table = {
			id: `table_${token}`,
			name: `new_table_${index + 1}`,
			columns: [
				{
					id: `column_${token}`,
					name: 'id',
					type: 'int',
					constraints: { pk: true, increment: true }
				}
			],
			indexes: [],
			position: {
				x: 80 + (index % 3) * 280,
				y: 80 + Math.floor(index / 3) * 220
			}
		};
		schemaStore.addTable(table);
		schemaStore.selectTable(table.id);
	}

	function openImport() {
		dbmlMode = 'import';
		dbmlText = '';
		dbmlErrors = [];
		dbmlOpen = true;
	}

	function openExport() {
		dbmlMode = 'export';
		dbmlText = generateDBML(schemaStore.schema);
		dbmlErrors = [];
		copyFeedback = 'Copy to clipboard';
		dbmlOpen = true;
	}

	function importDBML() {
		const result = parseDBML(dbmlText);
		dbmlErrors = result.errors.map((error) => `Line ${error.line}: ${error.message}`);
		if (result.schema) {
			schemaStore.importParseResult(result);
			dbmlOpen = false;
		}
	}

	async function handleDBMLFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		dbmlText = await file.text();
		dbmlErrors = [];
		input.value = '';
	}

	async function copyDBML() {
		try {
			await navigator.clipboard.writeText(dbmlText);
			copyFeedback = 'Copied';
			setTimeout(() => (copyFeedback = 'Copy to clipboard'), 1600);
		} catch {
			copyFeedback = 'Copy failed';
		}
	}

	function downloadDBML() {
		const blob = new Blob([dbmlText], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = `${diagramName.trim().replace(/[^a-z0-9_-]+/gi, '-') || 'diagram'}.dbml`;
		anchor.click();
		URL.revokeObjectURL(url);
	}
</script>

<svelte:head>
	<title>{diagramName || 'Diagram'} · DB Studio</title>
</svelte:head>

{#if loadState === 'loading'}
	<div class="flex min-h-screen items-center justify-center bg-muted/30">
		<div class="flex flex-col items-center gap-3 text-muted-foreground">
			<LoaderCircle class="size-6 animate-spin" />
			<p class="text-sm">Loading diagram…</p>
		</div>
	</div>
{:else if loadState === 'error'}
	<div class="flex min-h-screen items-center justify-center bg-muted/30 p-6">
		<div class="max-w-md text-center">
			<div class="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
				<AlertCircle class="size-7 text-destructive" />
			</div>
			<h1 class="text-2xl font-semibold">Diagram unavailable</h1>
			<p class="mt-2 text-muted-foreground">{loadError}</p>
			<div class="mt-6 flex justify-center gap-2">
				<Button variant="outline" href="/">
					<ArrowLeft data-icon="inline-start" />
					Library
				</Button>
				<Button onclick={() => void loadDiagram(diagramId)}>Try again</Button>
			</div>
		</div>
	</div>
{:else}
	<div class="flex h-screen min-w-0 flex-col overflow-hidden bg-background">
		<header class="flex h-16 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
			<Button
				variant="ghost"
				size="icon"
				onclick={goToLibrary}
				aria-label="Back to diagram library"
				title="Back to library"
			>
				<ArrowLeft />
			</Button>
			<span
				class="hidden size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:flex"
			>
				<Database class="size-4" />
			</span>

			<div class="min-w-0 flex-1">
				<Input
					bind:value={diagramName}
					maxlength={200}
					aria-label="Diagram name"
					class="h-8 max-w-md border-transparent bg-transparent px-2 text-base font-semibold shadow-none hover:border-input focus-visible:bg-background"
				/>
				<div class="mt-0.5 flex items-center gap-2 px-2 text-[11px] text-muted-foreground">
					{#if saveState === 'saving'}
						<LoaderCircle class="size-3 animate-spin" />
						<span>Saving…</span>
					{:else if saveState === 'dirty'}
						<span class="size-1.5 rounded-full bg-amber-500"></span>
						<span>Unsaved changes</span>
					{:else if saveState === 'error'}
						<AlertCircle class="size-3 text-destructive" />
						<span class="truncate text-destructive" title={saveError}>{saveError}</span>
					{:else}
						<Check class="size-3" />
						<span>Saved</span>
					{/if}
				</div>
			</div>

			<div class="flex shrink-0 items-center gap-1">
				<Button
					variant="outline"
					size="sm"
					class="hidden sm:inline-flex"
					onclick={openImport}
				>
					<FileInput data-icon="inline-start" />
					Import
				</Button>
				<Button
					size="sm"
					disabled={saveState === 'saving' || !dirty}
					onclick={() => void saveDiagram()}
				>
					{#if saveState === 'saving'}
						<LoaderCircle class="animate-spin" />
					{:else}
						<Save data-icon="inline-start" />
					{/if}
					<span class="hidden sm:inline">Save</span>
				</Button>
				<ThemeToggle />
			</div>
		</header>

		<div class="flex min-h-0 flex-1">
			<Sidebar
				schema={schemaStore.schema}
				selectedTableId={schemaStore.ui.selectedTableId}
				onSelectTable={(id) => schemaStore.selectTable(id)}
				onAddTable={addTable}
				onImportDBML={openImport}
				onExportDBML={openExport}
			/>

			<div class="flex min-w-0 flex-1 flex-col">
				<Toolbar
					viewport={schemaStore.viewport}
					showGrid={schemaStore.layout.showGrid}
					onZoomIn={() => schemaStore.zoom(1.2)}
					onZoomOut={() => schemaStore.zoom(0.8)}
					onResetView={() => schemaStore.resetViewport()}
					onToggleGrid={() => schemaStore.toggleGrid()}
				/>

				<div class="relative min-h-0 flex-1 overflow-hidden">
					<Canvas
						tables={schemaStore.schema.tables}
						relations={schemaStore.schema.relations}
						viewport={schemaStore.viewport}
						showGrid={schemaStore.layout.showGrid}
						gridSize={schemaStore.layout.gridSize}
						snapToGrid={schemaStore.layout.snapToGrid}
						selectedTableId={schemaStore.ui.selectedTableId}
						onPan={(dx, dy) => schemaStore.pan(dx, dy)}
						onZoom={(factor, cx, cy) => schemaStore.zoom(factor, cx, cy)}
						onSelectTable={(id) => schemaStore.selectTable(id)}
						onTableMove={(id, position) => schemaStore.moveTable(id, position)}
					/>

					{#if schemaStore.tables.length === 0}
						<div
							class="pointer-events-none absolute inset-0 flex items-center justify-center p-6"
						>
							<div
								class="pointer-events-auto max-w-sm rounded-xl border bg-background/95 p-6 text-center shadow-lg backdrop-blur"
							>
								<div class="mx-auto mb-4 flex size-11 items-center justify-center rounded-lg bg-muted">
									<Upload class="size-5 text-muted-foreground" />
								</div>
								<h2 class="font-semibold">Bring your schema to life</h2>
								<p class="mt-2 text-sm leading-6 text-muted-foreground">
									Paste or upload DBML to build the canvas, or start with a blank table.
								</p>
								<div class="mt-5 flex justify-center gap-2">
									<Button onclick={openImport}>
										<FileInput data-icon="inline-start" />
										Import DBML
									</Button>
									<Button variant="outline" onclick={addTable}>Add table</Button>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<Dialog.Root bind:open={dbmlOpen}>
	<Dialog.Content class="max-h-[90vh] sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>{dbmlMode === 'import' ? 'Import DBML' : 'Export DBML'}</Dialog.Title>
			<Dialog.Description>
				{dbmlMode === 'import'
					? 'Paste DBML below or choose a .dbml file. Importing replaces the current schema.'
					: 'Copy or download a DBML representation of the current schema.'}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-3 py-2">
			{#if dbmlMode === 'import'}
				<label class="flex items-center justify-between gap-3 text-sm font-medium" for="dbml-file">
					<span>DBML source</span>
					<Input
						id="dbml-file"
						type="file"
						accept=".dbml,text/plain"
						class="h-8 max-w-64 py-1 text-xs"
						onchange={handleDBMLFile}
					/>
				</label>
			{/if}
			<Textarea
				bind:value={dbmlText}
				readonly={dbmlMode === 'export'}
				placeholder={'Table users {\n  id int [pk]\n}'}
				class="min-h-80 resize-y font-mono text-xs leading-5"
				aria-label={dbmlMode === 'import' ? 'DBML to import' : 'Exported DBML'}
			/>
			{#if dbmlErrors.length > 0}
				<div class="max-h-28 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-3" role="alert">
					{#each dbmlErrors as error}
						<p class="text-xs text-destructive">{error}</p>
					{/each}
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => dbmlOpen = false}>Close</Button>
			{#if dbmlMode === 'import'}
				<Button disabled={!dbmlText.trim()} onclick={importDBML}>
					<FileInput data-icon="inline-start" />
					Import schema
				</Button>
			{:else}
				<Button variant="outline" onclick={downloadDBML}>
					<Download data-icon="inline-start" />
					Download
				</Button>
				<Button onclick={copyDBML}>
					<Clipboard data-icon="inline-start" />
					{copyFeedback}
				</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={leaveDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Leave with unsaved changes?</AlertDialog.Title>
			<AlertDialog.Description>
				Autosave has not completed. Save now to keep your latest schema and layout changes.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Keep editing</AlertDialog.Cancel>
			<Button variant="ghost" onclick={discardAndLeave}>Discard changes</Button>
			<Button onclick={() => void saveAndLeave()}>
				{#if saveState === 'saving'}<LoaderCircle class="animate-spin" />{/if}
				Save and leave
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
