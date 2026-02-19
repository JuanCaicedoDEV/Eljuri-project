export interface PhoneNumber {
    id: string;
    phoneNumber: string;
    campaignId: string | null;
    status: 'available' | 'in-use' | 'inactive';
    createdAt: string;
    updatedAt: string;
    notes?: string;
}

export interface CreatePhoneNumberDTO {
    phoneNumber: string;
    campaignId?: string;
    notes?: string;
}

export interface UpdatePhoneNumberDTO {
    campaignId?: string;
    status?: 'available' | 'in-use' | 'inactive';
    notes?: string;
}

// Phone number validation
export function validatePhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    // Check if it's a valid length (10-15 digits)
    return cleaned.length >= 10 && cleaned.length <= 15;
}

// Format phone number for display
export function formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');

    if (cleaned.length === 10) {
        // US format: (555) 123-4567
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    // International format: +1 555 123 4567
    return `+${cleaned}`;
}
