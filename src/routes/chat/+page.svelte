<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  // Server-side redirect handles this, but as a client-side fallback:
  onMount(() => { goto('/dashboard'); });
</script>

<p>Redirecting...</p>
