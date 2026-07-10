<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		ArrowRight,
		Database,
		FileCode2,
		FolderOpen,
		LoaderCircle,
		Pencil,
		Plus,
		RefreshCw,
		Trash2
	} from '@lucide/svelte';
	import { onMount } from 'svelte';
	import {
		createDiagram,
		deleteDiagram,
		listDiagrams,
		updateDiagram,
		type DiagramSummary
	} from '$lib/api/diagrams';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { DEFAULT_LAYOUT_STATE, DEFAULT_SCHEMA } from '$lib/types';

	let diagrams = $state<DiagramSummary[]>([]);
	let loading = $state(true);
	let loadError = $state('');
	let createOpen = $state(false);
	let createName = $state('');
	let creating = $state(false);
	let createError = $state('');
	let renameTarget = $state<DiagramSummary | null>(null);
	let renameName = $state('');
	let renaming = $state(false);
	let renameError = $state('');
	let deleteTarget = $state<DiagramSummary | null>(null);
	let deleting = $state(false);

	onMount(loadDiagrams);

	function copyPlain<T>(value: T): T {
		return JSON.parse(JSON.stringify(value)) as T;
	}

	async function loadDiagrams() {
		loading = true;
		loadError = '';
		try {
			diagrams = await listDiagrams();
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Could not load your diagrams.';
		} finally {
			loading = false;
		}
	}

	function showCreateDialog() {
		createName = '';
		createError = '';
		createOpen = true;
	}

	async function handleCreate(event: SubmitEvent) {
		event.preventDefault();
		if (!createName.trim() || creating) return;

		creating = true;
		createError = '';
		try {
			const diagram = await createDiagram({
				name: createName,
				schema: copyPlain(DEFAULT_SCHEMA),
				layout: copyPlain(DEFAULT_LAYOUT_STATE)
			});
			createOpen = false;
			await goto(`/diagrams/${diagram.id}`);
		} catch (error) {
			createError = error instanceof Error ? error.message : 'Could not create the diagram.';
		} finally {
			creating = false;
		}
	}

	function showRenameDialog(diagram: DiagramSummary) {
		renameTarget = diagram;
		renameName = diagram.name;
		renameError = '';
	}

	async function handleRename(event: SubmitEvent) {
		event.preventDefault();
		if (!renameTarget || !renameName.trim() || renaming) return;

		renaming = true;
		renameError = '';
		try {
			const updated = await updateDiagram(renameTarget.id, { name: renameName });
			diagrams = diagrams.map((diagram) =>
				diagram.id === updated.id
					? {
							id: updated.id,
							name: updated.name,
							createdAt: updated.createdAt,
							updatedAt: updated.updatedAt
						}
					: diagram
			);
			renameTarget = null;
		} catch (error) {
			renameError = error instanceof Error ? error.message : 'Could not rename the diagram.';
		} finally {
			renaming = false;
		}
	}

	async function handleDelete() {
		if (!deleteTarget || deleting) return;
		const id = deleteTarget.id;
		deleting = true;
		try {
			await deleteDiagram(id);
			diagrams = diagrams.filter((diagram) => diagram.id !== id);
			deleteTarget = null;
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Could not delete the diagram.';
		} finally {
			deleting = false;
		}
	}

	function formatUpdatedAt(value: string): string {
		return new Intl.DateTimeFormat(undefined, {
			month: 'short',
			day: 'numeric',
			year: new Date(value).getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(new Date(value));
	}
</script>

<svelte:head>
	<title>Diagram library · DB Studio</title>
</svelte:head>

<div class="min-h-screen bg-muted/30">
	<header class="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
		<div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
			<a class="flex items-center gap-2.5 font-semibold tracking-tight" href="/" aria-label="DB Studio home">
				<span class="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
					<Database class="size-5" />
				</span>
				<span>DB Studio</span>
			</a>
			<ThemeToggle />
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
		<section class="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
			<div>
				<p class="mb-2 text-sm font-medium text-muted-foreground">Your workspace</p>
				<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">Diagram library</h1>
				<p class="mt-3 max-w-2xl text-muted-foreground">
					Create and organize database diagrams, then import DBML when you are ready to design.
				</p>
			</div>
			<Button size="lg" onclick={showCreateDialog}>
				<Plus data-icon="inline-start" />
				New diagram
			</Button>
		</section>

		{#if loadError}
			<div
				class="mb-6 flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
				role="alert"
			>
				<div>
					<p class="font-medium text-destructive">We couldn’t load the library</p>
					<p class="mt-1 text-sm text-muted-foreground">{loadError}</p>
				</div>
				<Button variant="outline" onclick={loadDiagrams}>
					<RefreshCw data-icon="inline-start" />
					Try again
				</Button>
			</div>
		{/if}

		{#if loading}
			<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading diagrams">
				{#each Array(6) as _}
					<Card.Root>
						<Card.Header>
							<Skeleton class="size-11 rounded-lg" />
							<Skeleton class="mt-4 h-5 w-2/3" />
							<Skeleton class="h-4 w-1/2" />
						</Card.Header>
						<Card.Footer>
							<Skeleton class="h-9 w-full" />
						</Card.Footer>
					</Card.Root>
				{/each}
			</div>
		{:else if diagrams.length === 0 && !loadError}
			<Card.Root class="border-dashed py-16 text-center">
				<Card.Content class="mx-auto flex max-w-md flex-col items-center">
					<div class="mb-5 flex size-14 items-center justify-center rounded-2xl bg-muted">
						<FolderOpen class="size-7 text-muted-foreground" />
					</div>
					<h2 class="text-xl font-semibold">Create your first diagram</h2>
					<p class="mt-2 text-sm leading-6 text-muted-foreground">
						Start with a blank canvas. The editor makes it easy to paste or upload an existing DBML
						schema.
					</p>
					<Button class="mt-6" onclick={showCreateDialog}>
						<Plus data-icon="inline-start" />
						New diagram
					</Button>
				</Card.Content>
			</Card.Root>
		{:else if diagrams.length > 0}
			<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{#each diagrams as diagram (diagram.id)}
					<Card.Root class="group transition-shadow hover:shadow-md">
						<Card.Header>
							<div class="mb-4 flex items-start justify-between gap-3">
								<span class="flex size-11 items-center justify-center rounded-lg bg-muted">
									<FileCode2 class="size-5 text-muted-foreground" />
								</span>
								<div class="flex items-center">
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label={`Rename ${diagram.name}`}
										onclick={() => showRenameDialog(diagram)}
									>
										<Pencil />
									</Button>
									<Button
										variant="ghost"
										size="icon-sm"
										class="text-muted-foreground hover:text-destructive"
										aria-label={`Delete ${diagram.name}`}
										onclick={() => deleteTarget = diagram}
									>
										<Trash2 />
									</Button>
								</div>
							</div>
							<Card.Title class="truncate" title={diagram.name}>{diagram.name}</Card.Title>
							<Card.Description>Updated {formatUpdatedAt(diagram.updatedAt)}</Card.Description>
						</Card.Header>
						<Card.Footer>
							<Button href={`/diagrams/${diagram.id}`} variant="outline" class="w-full">
								Open diagram
								<ArrowRight data-icon="inline-end" />
							</Button>
						</Card.Footer>
					</Card.Root>
				{/each}
			</div>
		{/if}
	</main>
</div>

<Dialog.Root bind:open={createOpen}>
	<Dialog.Content class="sm:max-w-md">
		<form onsubmit={handleCreate}>
			<Dialog.Header>
				<Dialog.Title>New diagram</Dialog.Title>
				<Dialog.Description>
					Give your diagram a name. You can import DBML from the editor.
				</Dialog.Description>
			</Dialog.Header>
			<div class="py-5">
				<label for="diagram-name" class="mb-2 block text-sm font-medium">Diagram name</label>
				<Input
					id="diagram-name"
					bind:value={createName}
					maxlength={200}
					placeholder="e.g. Customer platform"
					autocomplete="off"
					autofocus
				/>
				{#if createError}
					<p class="mt-2 text-sm text-destructive" role="alert">{createError}</p>
				{/if}
			</div>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => createOpen = false}>Cancel</Button>
				<Button type="submit" disabled={!createName.trim() || creating}>
					{#if creating}<LoaderCircle class="animate-spin" />{/if}
					Create diagram
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root open={renameTarget !== null} onOpenChange={(open) => !open && (renameTarget = null)}>
	<Dialog.Content class="sm:max-w-md">
		<form onsubmit={handleRename}>
			<Dialog.Header>
				<Dialog.Title>Rename diagram</Dialog.Title>
				<Dialog.Description>Choose a clear name you will recognize in your library.</Dialog.Description>
			</Dialog.Header>
			<div class="py-5">
				<label for="rename-diagram" class="mb-2 block text-sm font-medium">Diagram name</label>
				<Input
					id="rename-diagram"
					bind:value={renameName}
					maxlength={200}
					autocomplete="off"
					autofocus
				/>
				{#if renameError}
					<p class="mt-2 text-sm text-destructive" role="alert">{renameError}</p>
				{/if}
			</div>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => renameTarget = null}>Cancel</Button>
				<Button type="submit" disabled={!renameName.trim() || renaming}>
					{#if renaming}<LoaderCircle class="animate-spin" />{/if}
					Save name
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<AlertDialog.Root open={deleteTarget !== null} onOpenChange={(open) => !open && (deleteTarget = null)}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete “{deleteTarget?.name}”?</AlertDialog.Title>
			<AlertDialog.Description>
				This permanently deletes the schema and saved layout. This action cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={deleting}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action variant="destructive" disabled={deleting} onclick={handleDelete}>
				{#if deleting}<LoaderCircle class="animate-spin" />{/if}
				Delete diagram
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
