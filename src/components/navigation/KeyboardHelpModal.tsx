import React from 'react';
import { Modal } from '../ui/Modal';

interface KeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardHelpModal: React.FC<KeyboardHelpModalProps> = ({ isOpen, onClose }) => {
  const shortcuts = [
    { key: 'Ctrl/Cmd + N', description: 'Quick add a new application' },
    { key: 'Ctrl/Cmd + K', description: 'Open command palette & global search' },
    { key: '?', description: 'Show keyboard shortcuts helper' },
    { key: 'Esc', description: 'Close any active modal or menu' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      description="Quick commands to navigate and track applications faster"
      maxWidth="md"
    >
      <div className="space-y-3">
        {shortcuts.map((s) => (
          <div
            key={s.key}
            className="flex items-center justify-between border-b border-slate-100 py-2 dark:border-slate-800 last:border-0"
          >
            <span className="text-sm text-slate-600 dark:text-slate-300">{s.description}</span>
            <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-xs">
              {s.key}
            </kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
};
