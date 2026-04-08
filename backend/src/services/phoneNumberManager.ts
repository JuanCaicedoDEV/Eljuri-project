import { PhoneNumber, CreatePhoneNumberDTO, UpdatePhoneNumberDTO, validatePhoneNumber } from '../models/PhoneNumber.js';

class PhoneNumberManager {
    private phoneNumbers: Map<string, PhoneNumber> = new Map();

    // Create a new phone number
    createPhoneNumber(dto: CreatePhoneNumberDTO): PhoneNumber {
        if (!validatePhoneNumber(dto.phoneNumber)) {
            throw new Error('Invalid phone number format');
        }

        // Check for duplicates
        const existing = Array.from(this.phoneNumbers.values())
            .find(pn => pn.phoneNumber === dto.phoneNumber);

        if (existing) {
            throw new Error('Phone number already exists');
        }

        const phoneNumber: PhoneNumber = {
            id: `phone-${Date.now()}-${crypto.randomUUID().toString().substr(2, 9)}`,
            phoneNumber: dto.phoneNumber,
            campaignId: dto.campaignId || null,
            status: 'available',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: dto.notes
        };

        this.phoneNumbers.set(phoneNumber.id, phoneNumber);
        console.log(`Created phone number ${phoneNumber.phoneNumber} with ID ${phoneNumber.id}`);
        return phoneNumber;
    }

    // Get a phone number by ID
    getPhoneNumber(id: string): PhoneNumber | undefined {
        return this.phoneNumbers.get(id);
    }

    // Get all phone numbers
    getAllPhoneNumbers(): PhoneNumber[] {
        return Array.from(this.phoneNumbers.values());
    }

    // Get phone numbers by campaign
    getPhoneNumbersByCampaign(campaignId: string): PhoneNumber[] {
        return Array.from(this.phoneNumbers.values())
            .filter(pn => pn.campaignId === campaignId);
    }

    // Get available phone numbers
    getAvailablePhoneNumbers(): PhoneNumber[] {
        return Array.from(this.phoneNumbers.values())
            .filter(pn => pn.status === 'available');
    }

    // Update a phone number
    updatePhoneNumber(id: string, dto: UpdatePhoneNumberDTO): PhoneNumber {
        const phoneNumber = this.phoneNumbers.get(id);
        if (!phoneNumber) {
            throw new Error('Phone number not found');
        }

        if (dto.campaignId !== undefined) {
            phoneNumber.campaignId = dto.campaignId;
        }
        if (dto.status !== undefined) {
            phoneNumber.status = dto.status;
        }
        if (dto.notes !== undefined) {
            phoneNumber.notes = dto.notes;
        }

        phoneNumber.updatedAt = new Date().toISOString();
        console.log(`Updated phone number ${phoneNumber.phoneNumber}`);
        return phoneNumber;
    }

    // Delete a phone number
    deletePhoneNumber(id: string): boolean {
        const phoneNumber = this.phoneNumbers.get(id);
        if (!phoneNumber) {
            return false;
        }

        this.phoneNumbers.delete(id);
        console.log(`Deleted phone number ${phoneNumber.phoneNumber}`);
        return true;
    }

    // Assign phone number to campaign
    assignToCampaign(phoneNumberId: string, campaignId: string): PhoneNumber {
        return this.updatePhoneNumber(phoneNumberId, { campaignId, status: 'available' });
    }

    // Mark phone number as in-use
    markInUse(phoneNumberId: string): PhoneNumber {
        return this.updatePhoneNumber(phoneNumberId, { status: 'in-use' });
    }

    // Mark phone number as available
    markAvailable(phoneNumberId: string): PhoneNumber {
        return this.updatePhoneNumber(phoneNumberId, { status: 'available' });
    }

    // Find phone number by number string
    findByPhoneNumber(phoneNumber: string): PhoneNumber | undefined {
        return Array.from(this.phoneNumbers.values())
            .find(pn => pn.phoneNumber === phoneNumber);
    }

    // Get statistics
    getStatistics() {
        const allPhoneNumbers = this.getAllPhoneNumbers();
        return {
            total: allPhoneNumbers.length,
            available: allPhoneNumbers.filter(pn => pn.status === 'available').length,
            inUse: allPhoneNumbers.filter(pn => pn.status === 'in-use').length,
            inactive: allPhoneNumbers.filter(pn => pn.status === 'inactive').length,
            assigned: allPhoneNumbers.filter(pn => pn.campaignId !== null).length,
            unassigned: allPhoneNumbers.filter(pn => pn.campaignId === null).length
        };
    }
}

// Singleton instance
export const phoneNumberManager = new PhoneNumberManager();
