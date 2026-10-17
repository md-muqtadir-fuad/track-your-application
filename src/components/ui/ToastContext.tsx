import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Undo2, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type?: 'success' | 'info' | 'error';
  message: string;
  undoAction?: () => void;
  undoLabel?: string;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const newToast: ToastMessage = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex items-center justify-between gap-3 border border-[#000000] bg-white px-4 py-3 text-xs text-[#000000] shadow-sm transition-all"
          >
            <div className="flex items-center gap-2">
              {toast.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-[#8E1616] shrink-0" />
              ) : (
                <CheckCircle className="h-4 w-4 text-[#8E1616] shrink-0" />
              )}
              <span className="font-mono">{toast.message}</span>
            </div>

            <div className="flex items-center gap-2">
              {toast.undoAction && (
                <button
                  type="button"
                  onClick={() => {
                    toast.undoAction?.();
                    removeToast(toast.id);
                  }}
                  className="inline-flex items-center gap-1 border border-[#000000]/30 bg-[#F8EEDF] px-2 py-1 text-[10px] font-mono font-bold text-[#000000] hover:bg-[#E8C999]"
                >
                  <Undo2 className="h-3 w-3" />
                  {toast.undoLabel ?? 'Undo'}
                </button>
              )}
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-[#000000]/40 hover:text-[#8E1616] p-0.5"
                aria-label="Dismiss toast"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
