<script lang="ts">
  import '../styles/global.scss';
  import { page } from '$app/stores';
  import { theme } from '$lib/stores/theme';
  import favicon from '$lib/assets/favicon.svg';

  let { data, children } = $props();

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/agents', label: 'Agents' },
    { href: '/environments', label: 'Environments' },
    { href: '/sessions', label: 'Sessions' },
    { href: '/chat', label: 'Chat' }
  ];

  function isActive(pathname: string, href: string): boolean {
    return pathname === href || pathname.startsWith(href + '/');
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell" data-theme={$theme}>
  {#if data.userId}
    <nav class="nav">
      <div class="nav__logo">Managed Agents</div>

      <div class="nav__links">
        {#each navLinks as link}
          <a
            href={link.href}
            class="nav__link"
            class:nav__link--active={isActive($page.url.pathname, link.href)}
          >
            {link.label}
          </a>
        {/each}
      </div>

      <div class="nav__actions">
        <a href="/settings" class="nav__link" class:nav__link--active={isActive($page.url.pathname, '/settings')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </a>
        <a href="/api/auth/logout" class="nav__link">Logout</a>
      </div>
    </nav>
  {/if}

  <main class="page">
    {@render children()}
  </main>
</div>
