<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  const { data } = $props();

  onMount(() => {
    goto(data.userId ? '/dashboard' : '/login');
  });
</script>
