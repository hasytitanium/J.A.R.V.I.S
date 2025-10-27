import React, { useState, useRef, useEffect } from 'react';
import { Persona } from '../types';
import { PERSONAS } from '../constants';

interface InputBarProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  currentPersona: Persona;
  onPersonaChange: (persona: Persona) => void;
  onToggleLiveView: () => void;
}

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
    </svg>
);

const CameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.776 48.776 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
    </svg>
);

const InputBar: React.FC<InputBarProps> = ({ onSendMessage, isLoading, currentPersona, onPersonaChange, onToggleLiveView }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-slate-900/50 backdrop-blur-sm border-t border-cyan-400/20">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start bg-slate-800 rounded-lg border border-slate-700 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400 transition-all">
          <div className="relative group">
            <select
              value={currentPersona.id}
              onChange={(e) => {
                const newPersona = PERSONAS.find(p => p.id === e.target.value);
                if (newPersona) onPersonaChange(newPersona);
              }}
              className="pl-3 pr-8 py-3 appearance-none bg-transparent text-cyan-300 focus:outline-none cursor-pointer h-full"
            >
              {PERSONAS.map(p => <option key={p.id} value={p.id} className="bg-slate-800 text-white">{p.name}</option>)}
            </select>
          </div>
          <div className="w-px h-6 bg-slate-700 self-center"></div>
          <button onClick={onToggleLiveView} className="p-3 text-slate-400 hover:text-cyan-300" aria-label="Start Live Conversation">
            <CameraIcon />
          </button>
          <div className="flex-1 relative">
            <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${currentPersona.name}... (e.g. '/image a cat')`}
                className="w-full bg-transparent p-3 text-slate-200 placeholder-slate-500 focus:outline-none resize-none max-h-40 overflow-y-auto"
                rows={1}
                disabled={isLoading}
            />
            {input && (
                <button 
                    onClick={() => setInput('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    aria-label="Clear input"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                </button>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-3 self-center text-slate-400 hover:text-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send Message"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputBar;