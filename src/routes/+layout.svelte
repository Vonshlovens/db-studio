<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta
		name="description"
		content="Design, visualize, and persist database diagrams with DBML."
	/>
</svelte:head>

<ModeWatcher themeColors={{ light: '#fafafa', dark: '#18181b' }} />
{@render children()}
