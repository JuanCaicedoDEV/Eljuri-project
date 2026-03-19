import { create } from 'zustand';

export interface PhoneNumber {
    id: string;
    phoneNumber: string;
    campaignId: string | null;
    status: 'available' | 'in-use' | 'inactive';
    createdAt: string;
    updatedAt: string;
    notes?: string;
}

interface PhoneNumberState {
    phoneNumbers: PhoneNumber[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchPhoneNumbers: () => Promise<void>;
    createPhoneNumber: (phoneNumber: string, campaignId?: string, notes?: string) => Promise<void>;
    updatePhoneNumber: (id: string, updates: Partial<PhoneNumber>) => Promise<void>;
    deletePhoneNumber: (id: string) => Promise<void>;
    assignToCampaign: (phoneNumberId: string, campaignId: string) => Promise<void>;
    getPhoneNumbersByCampaign: (campaignId: string) => PhoneNumber[];
}

export const getApiBase = () => {
    if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_BACKEND_URL) {
        return `${window.location.protocol}//${window.location.hostname}:3008/api`;
    }
    return process.env.NEXT_PUBLIC_BACKEND_URL ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api` : 'http://localhost:3008/api';
};
export const usePhoneNumberStore = create<PhoneNumberState>((set, get) => ({
    phoneNumbers: [],
    isLoading: false,
    error: null,

    fetchPhoneNumbers: async () => {
        set({ isLoading: true, error: null });
        try {
            const API_BASE = getApiBase();
            const response = await fetch(`${API_BASE}/phone-numbers`);
            if (!response.ok) throw new Error('Failed to fetch phone numbers');
            const data = await response.json();
            set({ phoneNumbers: data, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    createPhoneNumber: async (phoneNumber: string, campaignId?: string, notes?: string) => {
        set({ isLoading: true, error: null });
        try {
            const API_BASE = getApiBase();
            const response = await fetch(`${API_BASE}/phone-numbers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber, campaignId, notes })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create phone number');
            }
            const newPhoneNumber = await response.json();
            set(state => ({
                phoneNumbers: [...state.phoneNumbers, newPhoneNumber],
                isLoading: false
            }));
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    updatePhoneNumber: async (id: string, updates: Partial<PhoneNumber>) => {
        set({ isLoading: true, error: null });
        try {
            const API_BASE = getApiBase();
            const response = await fetch(`${API_BASE}/phone-numbers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!response.ok) throw new Error('Failed to update phone number');
            const updatedPhoneNumber = await response.json();
            set(state => ({
                phoneNumbers: state.phoneNumbers.map(pn =>
                    pn.id === id ? updatedPhoneNumber : pn
                ),
                isLoading: false
            }));
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    deletePhoneNumber: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            const API_BASE = getApiBase();
            const response = await fetch(`${API_BASE}/phone-numbers/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete phone number');
            set(state => ({
                phoneNumbers: state.phoneNumbers.filter(pn => pn.id !== id),
                isLoading: false
            }));
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    assignToCampaign: async (phoneNumberId: string, campaignId: string) => {
        await get().updatePhoneNumber(phoneNumberId, { campaignId, status: 'available' });
    },

    getPhoneNumbersByCampaign: (campaignId: string) => {
        return get().phoneNumbers.filter(pn => pn.campaignId === campaignId);
    }
}));
