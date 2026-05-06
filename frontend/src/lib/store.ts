import { useSyncExternalStore } from "react";

type Listener = () => void;

function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    set: (updater: (s: T) => T) => {
      state = updater(state);
      listeners.forEach((l) => l());
    },
    subscribe: (l: Listener) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

// ───── Types ─────
export interface CompanyProfile {
  name: string;
  logoDataUrl?: string;
  website: string;
  industry: string;
  country: string;
  city: string;
  stage: string;
  shortDescription: string;
  problem: string;
  solution: string;
  businessModel: string;
  traction: string;
  fundingRequirement: string;
  useOfFunds: string;
  contactPerson: string;
  email: string;
  phone: string;
  pitchDeckName?: string;
  createdAt?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  linkedin: string;
  email: string;
  bio: string;
  responsibility: string;
  tag: "Founder" | "Advisor" | "Employee" | "Board Member";
  photoDataUrl?: string;
}

export interface CompanyVideo {
  id: string;
  title: string;
  description: string;
  fileName: string;
  status: "Uploading" | "Uploaded" | "Processing" | "Ready";
  progress: number;
  uploadedAt: string;
}

export interface MeetingRecord {
  id: string;
  leadId?: string;
  with: string;
  contact: string;
  purpose: string;
  date: string;
  time: string;
  durationMin: number;
  prepNotes: string;
  dealSize: string;
  participants: string[];
  status: "Scheduled" | "Completed" | "Cancelled";
  createdAt: string;
}

export interface ActivityRecord {
  id: string;
  leadId?: string;
  leadName?: string;
  type: "Email" | "Meeting" | "DealRoom" | "Note" | "Call";
  summary: string;
  createdAt: string;
}

export interface CrmLead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  type: "Founder" | "Investor" | "Partner" | "Advisor" | "Other";
  source: string;
  status: "New" | "Contacted" | "Interested" | "In Discussion" | "Converted" | "Lost";
  notes: string;
  nextFollowUp: string;
  createdAt: string;
}

export interface PipelineDeal {
  id: string;
  name: string;
  company: string;
  dealRoomId: string;
  counterparty: string;
  stage: "New" | "Reviewing" | "Due Diligence" | "Negotiation" | "Committed" | "Closed" | "Lost";
  value: string;
  expectedClose: string;
  notes: string;
  createdAt: string;
}

export interface DealRoomRecord {
  id: string;
  name: string;
  companyProfile: string;
  dealType: string;
  fundingRound: string;
  fundingTarget: string;
  description: string;
  contactName: string;
  contactEmail: string;
  inviteEmail?: string;
  createdAt: string;
}

export interface Participant {
  id: string;
  dealRoomId: string;
  name: string;
  email: string;
  role: string;
  company: string;
  status: "Invited" | "Joined" | "NDA Accepted" | "Active";
  dateJoined?: string;
}

export interface QAQuestion {
  id: string;
  dealRoomId: string;
  side: "investor-to-founder" | "founder-to-investor";
  authorRole: "Investor" | "Founder";
  authorName: string;
  question: string;
  answer?: string;
  answeredAt?: string;
  createdAt: string;
  editedAt?: string;
}

// ───── Stores ─────
export const profileStore = createStore<CompanyProfile | null>(null);
export const teamStore = createStore<TeamMember[]>([]);
export const videosStore = createStore<CompanyVideo[]>([]);
export const leadsStore = createStore<CrmLead[]>([]);
export const pipelineStore = createStore<PipelineDeal[]>([]);
export const dealRoomsStore = createStore<DealRoomRecord[]>([]);
export const participantsStore = createStore<Participant[]>([]);
export const qaStore = createStore<QAQuestion[]>([]);
export const ndaAcceptedStore = createStore<Record<string, boolean>>({});
export const generatedNdaDocsStore = createStore<{ dealRoomId: string; name: string; createdAt: string }[]>([]);

// ───── Hooks ─────
function useStore<T>(s: { get: () => T; subscribe: (l: Listener) => () => void }) {
  return useSyncExternalStore(s.subscribe, s.get, s.get);
}
export const useProfile = () => useStore(profileStore);
export const useTeam = () => useStore(teamStore);
export const useVideos = () => useStore(videosStore);
export const useLeads = () => useStore(leadsStore);
export const usePipeline = () => useStore(pipelineStore);
export const useDealRooms = () => useStore(dealRoomsStore);
export const useParticipants = () => useStore(participantsStore);
export const useQA = () => useStore(qaStore);
export const useNdaAccepted = () => useStore(ndaAcceptedStore);
export const useGeneratedNdaDocs = () => useStore(generatedNdaDocsStore);

export const id = () => Math.random().toString(36).slice(2, 10);
