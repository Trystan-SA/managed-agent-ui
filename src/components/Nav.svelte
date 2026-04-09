<script lang="ts">
  import { page } from '$app/stores';

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

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }
</script>

<nav class="nav">
  <div class="nav__logo">
    <a href="/dashboard" class="nav__link">Managed Agents</a>
  </div>

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
    <a
      href="/settings"
      class="nav__link"
      class:nav__link--active={isActive($page.url.pathname, '/settings')}
      aria-label="Settings"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </a>
    <button class="nav__link" onclick={handleLogout}>Logout</button>
  </div>
</nav>
