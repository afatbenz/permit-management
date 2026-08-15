import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bell, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { api, type Notification } from '@/lib/api';
import { useRouter } from '@/lib/router';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

const TYPE_ICONS: Record<string, ReactNode> = {
  member_join_request: <UserPlus className="h-4 w-4" />,
  member_join_approved: <UserCheck className="h-4 w-4" />,
};

export function NotificationBell() {
  const { navigate } = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await api.listNotifications();
      setNotifications(res.notifications);
      setUnread(res.unreadCount);
    } catch {
      /* bell degrades silently */
    } finally {
      setLoading(false);
    }
  };

  // Initial load, then refresh whenever the panel is opened.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleOpen = async () => {
    setOpen((v) => {
      if (!v) load();
      return !v;
    });
  };

  const handleClick = async (n: Notification) => {
    // Mark read optimistically.
    if (!n.isRead) {
      setUnread((u) => Math.max(0, u - 1));
      setNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      api.markNotificationRead(n.id).catch(() => undefined);
    }
    // Deep-link pending-join requests to the Users page.
    if (n.type === 'member_join_request') {
      setOpen(false);
      navigate('/dashboard/users');
      return;
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative rounded-xl p-2.5 text-gray-500 transition-colors hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-800">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Notifikasi</p>
            {unread > 0 && (
              <span className="text-xs text-gray-400 dark:text-slate-500">{unread} belum dibaca</span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-gray-400 dark:text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
              </div>
            ) : notifications.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-400 dark:text-slate-500">Belum ada notifikasi</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClick(n)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/40 ${
                        n.isRead ? 'opacity-70' : ''
                      }`}
                    >
                      <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                        {TYPE_ICONS[n.type] ?? <Bell className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-gray-900 dark:text-white">{n.title}</span>
                        {n.message && (
                          <span className="mt-0.5 block text-xs text-gray-500 dark:text-slate-400">{n.message}</span>
                        )}
                        <span className="mt-1 block text-[11px] text-gray-400 dark:text-slate-500">{timeAgo(n.createdAt)}</span>
                      </span>
                      {!n.isRead && (
                        <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
