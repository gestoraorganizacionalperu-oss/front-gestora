import React from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageType } from '@/types';

interface MessageProps {
  type: MessageType;
  content: string;
  onClose: () => void;
}

const messageStyles: Record<MessageType, { bg: string; border: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-green-50 dark:bg-green-950',
    border: 'border-green-500',
    icon: <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />,
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-950',
    border: 'border-red-500',
    icon: <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    border: 'border-yellow-500',
    icon: <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />,
  },
  information: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-500',
    icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
  },
};

export const Message: React.FC<MessageProps> = ({ type, content, onClose }) => {
  const style = messageStyles[type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-lg animate-in slide-in-from-top-5 duration-300',
        style.bg,
        style.border
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
      <div className="flex-1 text-sm text-foreground">{content}</div>
      <button
        type="button"
        onClick={onClose}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
