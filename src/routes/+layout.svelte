<script lang="ts">
  import '../styles/global.scss';
  import { theme } from '$lib/stores/theme';
  import favicon from '$lib/assets/favicon.svg';
  import Nav from '$components/Nav.svelte';

  let { data, children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell" data-theme={$theme}>
  {#if data.userId}
    <Nav />
  {/if}

  <main class="page">
    {@render children()}
  </main>
</div>
