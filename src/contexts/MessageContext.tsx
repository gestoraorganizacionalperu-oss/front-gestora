import React, { createContext, useContext, useState, useCallback } from 'react';
import { Message } from '@/components/ui/message';
import type { MessageType, Message as MessageData } from '@/types';

interface MessageContextType {
  showMessage: (type: MessageType, content: string) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<MessageData[]>([]);

  const showMessage = useCallback((type: MessageType, content: string) => {
    const id = Math.random().toString(36).substring(7);
    const newMessage: MessageData = { id, type, content };

    setMessages((prev) => [...prev, newMessage]);

    setTimeout(() => {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    }, 5000);
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  return (
    <MessageContext.Provider value={{ showMessage }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full">
        {messages.map((msg) => (
          <Message key={msg.id} type={msg.type} content={msg.content} onClose={() => removeMessage(msg.id)} />
        ))}
      </div>
    </MessageContext.Provider>
  );
};

export const useMessage = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessage debe ser usado dentro de MessageProvider');
  }
  return context;
};
