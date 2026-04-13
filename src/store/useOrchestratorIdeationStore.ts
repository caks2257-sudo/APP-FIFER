import { create } from 'zustand';

export type OrchestratorIdeationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type OrchestratorIdeationState = {
  messages: OrchestratorIdeationMessage[];
  /** Solo para Fase -1: el copiloto global controla la petición ideate. */
  copilotLoading: boolean;
  setCopilotLoading: (v: boolean) => void;
  applyIdeationExchange: (userContent: string, assistantContent: string) => void;
  clearIdeation: () => void;
};

export const useOrchestratorIdeationStore = create<OrchestratorIdeationState>((set) => ({
  messages: [],
  copilotLoading: false,
  setCopilotLoading: (v) => set({ copilotLoading: v }),
  applyIdeationExchange: (userContent, assistantContent) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { role: 'user', content: userContent },
        { role: 'assistant', content: assistantContent },
      ],
    })),
  clearIdeation: () => set({ messages: [], copilotLoading: false }),
}));
