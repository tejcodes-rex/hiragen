'use client';

import * as React from 'react';
import * as Toast from '@radix-ui/react-toast';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}

let addToastFn: ((toast: Omit<ToastItem, 'id'>) => void) | null = null;

export function toast(data: Omit<ToastItem, 'id'>) {
  addToastFn?.(data);
}

export function Toaster() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    addToastFn = (data) => {
      const id = Math.random().toString(36).substring(7);
      setToasts((prev) => [...prev, { ...data, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    };
    return () => { addToastFn = null; };
  }, []);

  return (
    <Toast.Provider swipeDirection="right">
      {toasts.map((t) => (
        <Toast.Root
          key={t.id}
          className={cn(
            'fixed bottom-4 right-4 z-[100] flex w-full max-w-sm items-center justify-between rounded-lg border p-4 shadow-lg animate-fade-in',
            t.variant === 'destructive'
              ? 'border-destructive/50 bg-destructive/10 text-destructive'
              : t.variant === 'success'
                ? 'border-accent/50 bg-accent/10 text-accent'
                : 'border-border bg-card text-foreground'
          )}
        >
          <div>
            <Toast.Title className="text-sm font-semibold">{t.title}</Toast.Title>
            {t.description && (
              <Toast.Description className="mt-1 text-xs opacity-80">
                {t.description}
              </Toast.Description>
            )}
          </div>
          <Toast.Close className="ml-4 rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </Toast.Close>
        </Toast.Root>
      ))}
      <Toast.Viewport />
    </Toast.Provider>
  );
}
