<script lang="ts">
  import '../styles/global.scss';
  import { page } from '$app/stores';
  import { theme } from '$lib/stores/theme';
  import favicon from '$lib/assets/favicon.svg';
  import Nav from '$components/Nav.svelte';

  const { data, children } = $props();

  const pageClass = $derived(
    $page.url.pathname === '/dashboard' ? 'page page--fullbleed' : 'page'
  );
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell" data-theme={$theme}>
  {#if data.userId}
    <Nav />
  {/if}

  <main class={pageClass}>
    {@render children()}
  </main>
</div>
