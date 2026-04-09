export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export function statusColor(status: string): string {
  switch (status) {
    case 'idle': return 'green';
    case 'running': return 'blue';
    case 'rescheduling': return 'yellow';
    case 'terminated': return 'red';
    default: return 'gray';
  }
}
