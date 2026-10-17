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
            className="flex items-center justify-between border-b border-[#000000]/15 py-2.5 last:border-0"
          >
            <span className="text-xs font-sans text-[#000000]/80">{s.description}</span>
            <kbd className="border border-[#000000]/30 bg-[#F8EEDF] px-2 py-0.5 font-mono text-[11px] font-bold text-[#8E1616]">
              {s.key}
            </kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
};
