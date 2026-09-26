import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App as NativeApp } from '@capacitor/app';
import { toast } from 'sonner';
import { useAuth } from '../context/useAuth';
import { initializePush, isAndroid, setPushUser } from './push';

export default function NativeBridge() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  useEffect(() => {
    if (!isLoading) void setPushUser(user?.id || null).catch(() => toast.error('Could not restore phone notification settings.'));
  }, [user?.id, isLoading]);
  useEffect(() => {
    if (!isAndroid) return;
    document.documentElement.classList.add('native-app');
    const open = event => navigate(`/notifications/${event.detail}`);
    const received = () => toast('New team update', { action: { label: 'View', onClick: () => navigate('/notifications') } });
    window.addEventListener('devflow:open-notification', open);
    window.addEventListener('devflow:notification-received', received);
    void initializePush().catch(() => toast.error('Phone notifications could not initialize.'));
    const back = NativeApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack && !['/teams', '/login', '/'].includes(window.location.pathname)) window.history.back();
      else void NativeApp.minimizeApp();
    });
    return () => {
      window.removeEventListener('devflow:open-notification', open);
      window.removeEventListener('devflow:notification-received', received);
      void back.then(handle => handle.remove());
    };
  }, [navigate]);
  return null;
}
