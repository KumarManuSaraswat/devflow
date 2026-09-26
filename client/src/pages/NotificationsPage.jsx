import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/useAuth';
import usePollingResource from '../hooks/usePollingResource';
import { disablePhoneAlerts, enablePhoneAlerts, getPushState, isAndroid, pushInBuild, subscribePush } from '../mobile/push';
import { safeNotificationPath } from '../utils/notifications';
import Button from '../components/common/Button';

function PhoneSettings({ available }) {
  const { user } = useAuth();
  const push = useSyncExternalStore(subscribePush, getPushState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const change = async () => {
    setBusy(true); setError('');
    try {
      if (push.status === 'enabled') await disablePhoneAlerts(user.id);
      else await enablePhoneAlerts(user.id);
    } catch (err) { setError(err.message || 'Could not change notification settings. Please retry.'); }
    finally { setBusy(false); }
  };
  return <section className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-violet-50 p-5 sm:p-6" aria-label="Phone notifications">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="max-w-xl"><h2 className="text-lg font-bold text-slate-900">Your team, in your pocket</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Get an alert for assignments, review feedback and team conversations. Tap it to jump back into the work.</p></div>
      {isAndroid && <Button disabled={busy || push.status === 'busy' || !pushInBuild || !available} onClick={change}>
        {busy || push.status === 'busy' ? 'Connecting…' : push.status === 'enabled' ? 'Turn off phone alerts' : 'Enable phone alerts'}
      </Button>}
    </div>
    <p className="mt-3 text-xs leading-5 text-slate-500">
      {!isAndroid ? 'Phone push is available in the Android app. Your inbox works here on the web too.'
        : !pushInBuild ? 'This build does not have Firebase configured yet. The inbox still works.'
        : !available ? 'Your server administrator needs to finish Firebase setup before phone alerts can be enabled.'
        : push.message || 'Off until you choose to enable them. Android notification settings also apply.'}
    </p>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </section>;
}

function Inbox({ cursor, setCursor }) {
  const load = useCallback(async signal => {
    const { data: settings } = await api.get('/notifications/settings', { signal });
    if (!settings.enabled) return { ...settings, notifications: [], unread: 0 };
    const { data } = await api.get('/notifications', { signal, params: cursor ? { before: cursor } : {} });
    return { ...settings, ...data };
  }, [cursor]);
  const { data, error, refresh } = usePollingResource(load, { interval: 30000 });
  useEffect(() => {
    const received = () => { void refresh(); };
    window.addEventListener('devflow:notification-received', received);
    return () => window.removeEventListener('devflow:notification-received', received);
  }, [refresh]);
  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-widest text-brand-600">Stay in the loop</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Your inbox</h1>
        <p className="mt-2 text-sm text-slate-500">Assignments, feedback and conversations, all in one place.</p></div>
      <Button variant="secondary" onClick={() => void refresh()}>Refresh</Button>
    </header>
    <PhoneSettings available={data?.pushAvailable} />
    {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error.message} <button className="font-semibold underline" onClick={() => void refresh()}>Retry</button></div>}
    {!data && !error && <p role="status" className="text-sm text-slate-500">Loading your updates…</p>}
    {data && !data.enabled && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><h2 className="font-semibold">Notifications are coming to this workspace</h2><p className="mt-2 text-sm text-slate-500">The backend notification update needs to be enabled by your administrator.</p></div>}
    {data?.enabled && <section aria-label="Your notifications">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-slate-800">{cursor ? 'Earlier updates' : 'Latest updates'}</h2><span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">{data.unread} unread</span></div>
      {!data.notifications.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-center"><div aria-hidden="true" className="text-3xl">✓</div><h3 className="mt-3 font-semibold text-slate-800">You’re all caught up</h3><p className="mt-2 text-sm text-slate-500">New team activity will appear here. Your own actions don’t notify you.</p></div>
        : <ul className="space-y-3">{data.notifications.map(note => <li key={note.id}>
          <Link to={`/notifications/${note.id}`} className={`motion-button flex items-center gap-4 rounded-2xl border p-5 shadow-sm ${note.readAt ? 'border-slate-200 bg-white/70' : 'border-brand-200 bg-white'}`}>
            <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${note.readAt ? 'bg-slate-200' : 'bg-brand-500'}`} />
            <div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{note.title}</p><p className="mt-1 text-xs text-slate-500">{new Date(note.createdAt).toLocaleString()} · {note.readAt ? 'Read' : 'Unread'}</p></div><span aria-hidden="true">→</span>
          </Link></li>)}</ul>}
      <div className="mt-5 flex gap-3">{cursor && <Button variant="secondary" onClick={() => setCursor(null)}>Latest updates</Button>}{data.nextCursor && <Button variant="secondary" onClick={() => setCursor(data.nextCursor)}>Older updates</Button>}</div>
    </section>}
    <p className="text-xs text-slate-400">The inbox refreshes while visible. Delivery may be delayed by network, battery settings or server availability.</p>
  </div>;
}

export default function NotificationsPage() {
  const [cursor, setCursor] = useState(null);
  const { user } = useAuth();
  return <Inbox key={`${user.id}:${cursor || 'latest'}`} cursor={cursor} setCursor={setCursor} />;
}

export function NotificationRedirect() {
  const { notificationId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const { data } = await api.get(`/notifications/${notificationId}`, { signal: controller.signal });
        await api.patch(`/notifications/${notificationId}/read`, {}, { signal: controller.signal });
        if (!controller.signal.aborted) navigate(safeNotificationPath(data.notification.href), { replace: true });
      } catch (err) {
        if (!controller.signal.aborted) setError(err.response?.data?.message || 'Unable to open this update. Check your connection and try again.');
      }
    })();
    return () => controller.abort();
  }, [notificationId, navigate]);
  return <div className="rounded-2xl border border-slate-200 bg-white p-6"><p role={error ? 'alert' : 'status'}>{error || 'Opening your team update…'}</p><Link to="/notifications" className="mt-4 inline-block text-brand-600 underline">Back to inbox</Link></div>;
}
