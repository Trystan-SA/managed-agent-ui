<script lang="ts">
  let { status, size = 'md' }: { status: string; size?: 'sm' | 'md' } = $props();
</script>

<span class="badge badge--{status} badge--{size}">{status}</span>
