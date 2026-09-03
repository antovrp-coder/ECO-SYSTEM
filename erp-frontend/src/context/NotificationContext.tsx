import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { NotificationItem } from '../types';

interface NotificationContextType {
  notifications: NotificationItem[];
  show: (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => string;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  remove: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const remove = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const show = useCallback(
    (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 3500) => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      const notification: NotificationItem = {
        id,
        message,
        type,
        duration,
        startTime: Date.now(),
      };

      setNotifications((prev) => [...prev, notification]);

      if (duration > 0) {
        setTimeout(() => {
          remove(id);
        }, duration);
      }

      return id;
    },
    [remove]
  );

  const success = useCallback((message: string, duration?: number) => show(message, 'success', duration || 3000), [show]);
  const error = useCallback((message: string, duration?: number) => show(message, 'error', duration || 5000), [show]);
  const info = useCallback((message: string, duration?: number) => show(message, 'info', duration || 3000), [show]);
  const warning = useCallback((message: string, duration?: number) => show(message, 'warning', duration || 4000), [show]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        show,
        success,
        error,
        info,
        warning,
        remove,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
