"use client";

import React, { useEffect, useState } from 'react';
import { usePhoneNumberStore } from '../store/usePhoneNumberStore';
import { Button } from '../src/components/ui/button';
import { Input } from '../src/components/ui/input';
import { Label } from '../src/components/ui/label';

interface PhoneNumberFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function PhoneNumberForm({ onClose, onSuccess }: PhoneNumberFormProps) {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [campaignId, setCampaignId] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const { createPhoneNumber, isLoading } = usePhoneNumberStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!phoneNumber.trim()) {
            setError('Phone number is required');
            return;
        }

        try {
            await createPhoneNumber(phoneNumber, campaignId || undefined, notes || undefined);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create phone number');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4 text-gray-900">Add Phone Number</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="phoneNumber">Phone Number *</Label>
                        <Input
                            id="phoneNumber"
                            type="tel"
                            placeholder="+1 (555) 123-4567"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label htmlFor="campaignId">Campaign ID (Optional)</Label>
                        <Input
                            id="campaignId"
                            type="text"
                            placeholder="campaign-001"
                            value={campaignId}
                            onChange={(e) => setCampaignId(e.target.value)}
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Input
                            id="notes"
                            type="text"
                            placeholder="Additional information..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="mt-1"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="outline"
                            className="flex-1"
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Adding...' : 'Add Phone Number'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
