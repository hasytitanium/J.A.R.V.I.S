import React, { useRef, useEffect } from 'react';
import { Message as MessageType } from '../types';
import Message from './Message';
import LoadingIndicator from './LoadingIndicator';
import JarvisCore from './JarvisCore';

interface ChatWindowProps {
  messages: MessageType[];
  isLoading: boolean;
  loadingEmoji: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading, loadingEmoji }) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length <= 1) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 overflow-hidden">
        <JarvisCore />
        <div className="mt-8 animate-fade-in w-full max-w-2xl">
          {messages[0] && <Message message={messages[0]} />}
        </div>
        <div ref={chatEndRef} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.map((msg) => (
        <Message key={msg.id} message={msg} />
      ))}
      {isLoading && <LoadingIndicator emoji={loadingEmoji} />}
      <div ref={chatEndRef} />
    </div>
  );
};

export default ChatWindow;