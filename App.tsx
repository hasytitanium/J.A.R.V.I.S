import React, { useState, useCallback, useRef } from 'react';
import { Message, Persona } from './types';
import { PERSONAS } from './constants';
import { getEmojiForPrompt, generateChatResponse, generateImage, generateVideo } from './services/geminiService';
import Header from './components/Header';
import ChatWindow from './components/ChatWindow';
import InputBar from './components/InputBar';
import LiveView from './components/LiveView';

// Fix: Consolidated all global type declarations in this file to resolve conflicts.
declare global {
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }
    interface Window {
        aistudio: AIStudio;
        webkitAudioContext: typeof AudioContext;
    }
}

const VeoApiKeyModal = ({ onConfirm, onCancel }: { onConfirm: () => void, onCancel: () => void }) => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-slate-800 border border-cyan-400/50 rounded-lg p-6 max-w-md text-center shadow-2xl shadow-cyan-500/20 relative">
            <h2 className="text-xl font-bold text-cyan-300 mb-2">API Key Required for Video</h2>
            <p className="text-slate-300 mb-4">
                The Veo video model requires selecting an API key for billing. See {' '}
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-200">
                    billing info
                </a> for details.
            </p>
            <button
                onClick={onConfirm}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors w-full"
            >
                Select API Key & Generate
            </button>
            <button
                onClick={onCancel}
                className="absolute top-2 right-2 text-slate-400 hover:text-white"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    </div>
);


const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: 'Assalam-u-Alaikum! Main J.A.R.V.I.S Hoon. How may I assist you today?',
      personaId: PERSONAS[0].id,
    }
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingEmoji, setLoadingEmoji] = useState<string>('🤔');
  const [currentPersona, setCurrentPersona] = useState<Persona>(PERSONAS[0]);
  const [isLiveViewOpen, setIsLiveViewOpen] = useState<boolean>(false);
  const [showVeoModal, setShowVeoModal] = useState<boolean>(false);
  const videoPromptToRetry = useRef<string | null>(null);

  const addAiMessage = (text: string, imageUrl?: string, videoUrl?: string) => {
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'ai',
      text: text,
      imageUrl: imageUrl,
      videoUrl: videoUrl,
      personaId: currentPersona.id,
    };
    setMessages(prev => [...prev, aiMessage]);
  }

  const handleVideoGeneration = useCallback(async (text: string) => {
    videoPromptToRetry.current = text;
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
        setShowVeoModal(true);
        return;
    }
    
    setIsLoading(true);
    setLoadingEmoji('🎬');
    
    try {
        addAiMessage("Generating your video. This may take a few moments...");
        const videoUrl = await generateVideo(text);
        addAiMessage(`Here is the video you requested for: "${text.replace('/video', '').trim()}"`, undefined, videoUrl);
    } catch (error: any) {
        console.error(error);
        let errorMessage = "Sorry, I couldn't create a video for that. Please try a different prompt.";
        if (error.message && error.message.includes("Requested entity was not found")) {
            errorMessage = "There was an issue with your API Key. Please select it again to continue.";
            setShowVeoModal(true); // Re-prompt for key
        }
        addAiMessage(errorMessage);
    } finally {
        setIsLoading(false);
        videoPromptToRetry.current = null;
    }
  }, [currentPersona]);
  
  const handleSendMessage = useCallback(async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      personaId: currentPersona.id,
    };
    setMessages(prev => [...prev, userMessage]);
    
    if (text.toLowerCase().startsWith('/video')) {
        handleVideoGeneration(text);
        return;
    }
    
    setIsLoading(true);
    const emoji = await getEmojiForPrompt(text);
    setLoadingEmoji(emoji);

    let aiResponseText: string | null = null;
    let aiImageUrl: string | null = null;

    if (text.toLowerCase().startsWith('/image')) {
      try {
        const imageUrl = await generateImage(text);
        aiImageUrl = imageUrl;
        aiResponseText = `Here is the image you requested for: "${text.replace('/image', '').trim()}"`;
      } catch (error) {
        aiResponseText = "Sorry, I couldn't create an image for that. Please try a different prompt.";
      }
    } else {
      aiResponseText = await generateChatResponse(text, currentPersona);
    }
    
    addAiMessage(aiResponseText, aiImageUrl ?? undefined);
    setIsLoading(false);
  }, [currentPersona, handleVideoGeneration]);

  const handlePersonaChange = (persona: Persona) => {
    setCurrentPersona(persona);
    addAiMessage(`Okay, I'll now respond as ${persona.name}.`);
  };
  
  const toggleLiveView = () => setIsLiveViewOpen(prev => !prev);
  
  const handleVeoConfirm = async () => {
    setShowVeoModal(false);
    await window.aistudio.openSelectKey();
    if (videoPromptToRetry.current) {
        handleVideoGeneration(videoPromptToRetry.current);
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-900 text-white flex flex-col font-sans overflow-hidden">
        {/* Background Effects */}
        <div 
            className="absolute inset-0 z-0 animate-pulse-glow"
            style={{
                backgroundImage: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.1) 0%, transparent 50%)',
            }}
        ></div>
        <div
            className="absolute inset-0 z-0"
            style={{
                backgroundImage: 'radial-gradient(white 0.5px, transparent 0.5px)',
                backgroundSize: '20px 20px',
                opacity: 0.1,
            }}
        ></div>
        <div 
            className="absolute inset-0 z-0 bg-grid-cyan-400/10 bg-[length:30px_30px] [mask-image:linear-gradient(to_bottom,white_0,white_50%,transparent_100%)] animate-grid">
        </div>
        
        {/* Main Content */}
        <div className="relative z-10 flex flex-col h-full">
            <Header />
            <ChatWindow messages={messages} isLoading={isLoading} loadingEmoji={loadingEmoji} />
            <InputBar 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading} 
            currentPersona={currentPersona}
            onPersonaChange={handlePersonaChange}
            onToggleLiveView={toggleLiveView}
            />
        </div>
        
        {isLiveViewOpen && <LiveView persona={currentPersona} onClose={toggleLiveView} />}
        {showVeoModal && <VeoApiKeyModal onConfirm={handleVeoConfirm} onCancel={() => setShowVeoModal(false)} />}
    </div>
  );
};

export default App;