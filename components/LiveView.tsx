import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob as GenAI_Blob } from '@google/genai';
import { Persona } from '../types';

// Fix: Removed `declare global` block. All global type declarations are now consolidated in App.tsx.

interface LiveViewProps {
  onClose: () => void;
  persona: Persona;
}

type Status = 'CONNECTING' | 'LIVE' | 'DONE' | 'ERROR';
type FacingMode = 'user' | 'environment';

// --- Audio & Base64 Helper Functions ---
const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const SwitchCameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.667 0l3.181-3.183m-4.991-2.691v4.992h-4.992m0 0 3.181-3.183a8.25 8.25 0 0 0-11.667 0l3.181 3.183" />
    </svg>
);


const LiveView: React.FC<LiveViewProps> = ({ onClose, persona }) => {
    const [status, setStatus] = useState<Status>('CONNECTING');
    const [error, setError] = useState<string | null>(null);
    const [userTranscript, setUserTranscript] = useState<string>('');
    const [aiTranscript, setAiTranscript] = useState<string>('');
    const [transcriptHistory, setTranscriptHistory] = useState<{ user: string, ai: string }[]>([]);
    const [facingMode, setFacingMode] = useState<FacingMode>('user');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const videoStreamRef = useRef<MediaStream | null>(null);
    
    // Audio processing refs
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const frameIntervalRef = useRef<number | null>(null);


    const cleanup = useCallback(() => {
        console.log("Cleaning up resources...");
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }
        
        sessionPromiseRef.current?.then(session => session.close());
        
        if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(track => track.stop());
        if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach(track => track.stop());

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
             sourcesRef.current.forEach(source => source.stop());
             sourcesRef.current.clear();
             outputAudioContextRef.current.close();
        }
    }, []);

    const switchCamera = useCallback(async () => {
        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
        if (videoStreamRef.current) {
            videoStreamRef.current.getTracks().forEach(track => track.stop());
        }
        try {
            const newVideoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacingMode } });
            videoStreamRef.current = newVideoStream;
            if (videoRef.current) {
                videoRef.current.srcObject = newVideoStream;
            }
            setFacingMode(newFacingMode);
        } catch (err) {
            console.error("Failed to switch camera:", err);
            setError("Failed to switch camera. Please check permissions.");
        }
    }, [facingMode]);

    useEffect(() => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const init = async () => {
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioStreamRef.current = audioStream;
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                videoStreamRef.current = videoStream;

                if (videoRef.current) {
                    videoRef.current.srcObject = videoStream;
                }
                
                inputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
                outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
                
                sessionPromiseRef.current = ai.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    config: {
                        responseModalities: [Modality.AUDIO],
                        inputAudioTranscription: {},
                        outputAudioTranscription: {},
                        systemInstruction: persona.systemInstruction,
                    },
                    callbacks: {
                        onopen: () => {
                            setStatus('LIVE');
                            const source = inputAudioContextRef.current!.createMediaStreamSource(audioStream);
                            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                            scriptProcessorRef.current = scriptProcessor;

                            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                                const l = inputData.length;
                                const int16 = new Int16Array(l);
                                for (let i = 0; i < l; i++) {
                                    int16[i] = inputData[i] * 32768;
                                }
                                const pcmBlob: GenAI_Blob = {
                                    data: encode(new Uint8Array(int16.buffer)),
                                    mimeType: 'audio/pcm;rate=16000',
                                };
                                sessionPromiseRef.current?.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            };
                            source.connect(scriptProcessor);
                            scriptProcessor.connect(inputAudioContextRef.current!.destination);
                        },
                        onmessage: async (message: LiveServerMessage) => {
                            if (message.serverContent?.inputTranscription) {
                                setUserTranscript(prev => prev + message.serverContent.inputTranscription.text);
                            }
                            if (message.serverContent?.outputTranscription) {
                                setAiTranscript(prev => prev + message.serverContent.outputTranscription.text);
                            }
                            if (message.serverContent?.turnComplete) {
                                const finalUser = userTranscript + (message.serverContent?.inputTranscription?.text || '');
                                const finalAi = aiTranscript + (message.serverContent?.outputTranscription?.text || '');
                                if(finalUser.trim() && finalAi.trim()) {
                                  setTranscriptHistory(prev => [...prev, { user: finalUser, ai: finalAi }]);
                                }
                                setUserTranscript('');
                                setAiTranscript('');
                            }
                            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                            if (base64Audio) {
                                const outputCtx = outputAudioContextRef.current;
                                if(outputCtx) {
                                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                                    const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                                    const source = outputCtx.createBufferSource();
                                    source.buffer = audioBuffer;
                                    source.connect(outputCtx.destination);
                                    source.addEventListener('ended', () => {
                                        sourcesRef.current.delete(source);
                                    });
                                    source.start(nextStartTimeRef.current);
                                    nextStartTimeRef.current += audioBuffer.duration;
                                    sourcesRef.current.add(source);
                                }
                            }
                        },
                        onerror: (e: ErrorEvent) => {
                            console.error('API Error:', e);
                            setError('An API error occurred. The session has ended.');
                            setStatus('ERROR');
                            cleanup();
                        },
                        onclose: (e: CloseEvent) => {
                            console.log('Session closed.');
                            setStatus('DONE');
                            cleanup();
                        },
                    },
                });

                frameIntervalRef.current = window.setInterval(() => {
                    const video = videoRef.current;
                    const canvas = canvasRef.current;
                    if (video && canvas && video.readyState >= 3 && video.videoWidth > 0) {
                        const context = canvas.getContext('2d');
                        if (context) {
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            context.drawImage(video, 0, 0, canvas.width, canvas.height);
                            canvas.toBlob(async (blob) => {
                                if (blob) {
                                    const base64Data = await blobToBase64(blob);
                                    sessionPromiseRef.current?.then((session) => {
                                        session.sendRealtimeInput({
                                            media: { data: base64Data, mimeType: 'image/jpeg' }
                                        });
                                    });
                                }
                            }, 'image/jpeg', 0.8);
                        }
                    }
                }, 1000 / 15); // 15 FPS

            } catch (err) {
                console.error("Initialization failed:", err);
                if (err instanceof Error) {
                    setError(`Failed to start session: ${err.message}. Please check camera/microphone permissions.`);
                } else {
                    setError("An unknown error occurred during initialization.");
                }
                setStatus('ERROR');
            }
        };

        init();

        return () => {
            cleanup();
        };
    }, [persona, cleanup]);

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-50 flex flex-col animate-fade-in">
            <div className="relative w-full h-full flex items-center justify-center">
                <video ref={videoRef} autoPlay muted playsInline className={`absolute top-0 left-0 w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
                <canvas ref={canvasRef} className="hidden" />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/80" />

                <div className="relative z-10 p-6 w-full h-full flex flex-col justify-between">
                    {/* Header */}
                    <div className="flex justify-between items-center text-white">
                        <div className="flex items-center space-x-2">
                            <span className={`w-3 h-3 rounded-full ${status === 'LIVE' ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></span>
                            <span className="font-semibold uppercase tracking-wider">{status}</span>
                        </div>
                        <button onClick={switchCamera} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors" aria-label="Switch Camera">
                            <SwitchCameraIcon />
                        </button>
                    </div>

                    {/* Transcripts */}
                    <div className="flex-1 flex flex-col justify-end pb-24 space-y-4 overflow-y-auto">
                        {transcriptHistory.map((t, i) => (
                           <div key={i} className="animate-fade-in">
                               <p className="text-gray-400 font-medium">You: <span className="text-gray-200 font-normal">{t.user}</span></p>
                               <p className="text-cyan-400 font-medium">{persona.name}: <span className="text-cyan-200 font-normal">{t.ai}</span></p>
                           </div>
                        ))}
                         <div>
                            {userTranscript && <p className="text-gray-400 font-medium">You: <span className="text-gray-200 font-normal">{userTranscript}</span></p>}
                            {aiTranscript && <p className="text-cyan-400 font-medium">{persona.name}: <span className="text-cyan-200 font-normal">{aiTranscript}</span></p>}
                        </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                        {error && <p className="text-red-400 mb-4">{error}</p>}
                        <button onClick={onClose} className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-full transition-colors shadow-lg shadow-red-500/30">
                            End Conversation
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveView;