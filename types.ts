export type Sender = 'user' | 'ai';

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  personaId: string;
}

export interface Persona {
  id: string;
  name: string;
  systemInstruction: string;
}