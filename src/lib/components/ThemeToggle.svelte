<script lang="ts">
	import { Check, Monitor, Moon, Sun } from '@lucide/svelte';
	import { mode, setMode, userPrefersMode } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

	const choices = [
		{ value: 'light' as const, label: 'Light', icon: Sun },
		{ value: 'dark' as const, label: 'Dark', icon: Moon },
		{ value: 'system' as const, label: 'System', icon: Monitor }
	];
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" size="icon" aria-label="Change color theme">
				{#if mode.current === 'dark'}
					<Moon />
				{:else}
					<Sun />
				{/if}
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="w-36">
		<DropdownMenu.Label>Appearance</DropdownMenu.Label>
		{#each choices as choice}
			<DropdownMenu.Item onclick={() => setMode(choice.value)}>
				<choice.icon />
				<span>{choice.label}</span>
				{#if userPrefersMode.current === choice.value}
					<Check class="ml-auto" />
				{/if}
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
