import React from 'react';
import { useNotification } from '../../context/NotificationContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const NotificationToast: React.FC = () => {
  const { notifications, remove } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '24rem', width: '100%' }}>
      {notifications.map((n) => {
        let bg = 'var(--app-surface)';
        let border = 'var(--app-border)';
        let textColor = 'var(--app-text)';
        let Icon = Info;
        let iconColor = 'var(--app-primary)';

        if (n.type === 'success') {
          Icon = CheckCircle2;
          iconColor = 'var(--app-success)';
        } else if (n.type === 'error') {
          Icon = AlertCircle;
          iconColor = 'var(--app-danger)';
        } else if (n.type === 'warning') {
          Icon = AlertTriangle;
          iconColor = 'var(--app-warning)';
        }

        return (
          <div
            key={n.id}
            className="animate-slide-in"
            style={{
              backgroundColor: bg,
              border: `1px solid ${border}`,
              borderRadius: '0.75rem',
              padding: '0.875rem 1rem',
              boxShadow: 'var(--app-shadow-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: textColor,
            }}
          >
            <Icon size={20} color={iconColor} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500 }}>{n.message}</div>
            <button
              onClick={() => remove(n.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--app-muted)',
                cursor: 'pointer',
                display: 'flex',
                padding: '0.25rem',
              }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
