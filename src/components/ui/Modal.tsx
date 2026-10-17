import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className={`w-full ${maxWidthClasses[maxWidth]} overflow-hidden rounded-none border-2 border-[#000000] bg-[#F8EEDF] shadow-2xl text-[#000000] flex flex-col max-h-[90vh]`}
      >
        <div className="flex items-start justify-between border-b border-[#000000]/15 px-6 py-4 bg-[#F8EEDF]">
          <div>
            <h2
              id="modal-title"
              className="font-serif text-lg font-bold tracking-tight text-[#8E1616]"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 font-mono text-xs uppercase tracking-wider text-[#000000]/60">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-none p-1 text-[#000000]/60 hover:bg-[#E8C999]/40 hover:text-[#000000] transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-[#8E1616]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-[#F8EEDF] text-[#000000]">{children}</div>
      </div>
    </div>
  );
};
