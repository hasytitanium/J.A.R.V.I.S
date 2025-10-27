import React from 'react';
import { Message as MessageType, Persona } from '../types';
import { PERSONAS } from '../constants';

interface MessageProps {
  message: MessageType;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const persona = PERSONAS.find(p => p.id === message.personaId);

  const personaName = !isUser ? (persona ? persona.name : 'AI') : 'You';
  const personaColor = isUser ? 'text-gray-400' : 'text-gray-300';

  return (
    <div className={`flex flex-col mb-6 ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-xs md:max-w-md lg:max-w-2xl px-1 ${isUser ? 'text-right' : 'text-left'}`}>
        <p className={`font-bold text-sm mb-1 ${personaColor}`}>{personaName}</p>
        <div
          className={`relative rounded-lg px-4 py-3 shadow-lg ${
            isUser
              ? 'bg-gray-800 text-slate-100 rounded-br-none'
              : 'bg-gray-900 border border-gray-800 text-slate-200 rounded-bl-none'
          }`}
        >
          {message.imageUrl && (
            <div className={message.text ? "mb-2" : ""}>
              <img src={message.imageUrl} alt="Content" className="rounded-lg w-full h-auto" />
            </div>
          )}
          {message.text && <p className="text-base whitespace-pre-wrap">{message.text}</p>}
          {message.videoUrl && (
            <div className="mt-2">
                <video src={message.videoUrl} controls autoPlay muted loop className="rounded-lg w-full h-auto" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;