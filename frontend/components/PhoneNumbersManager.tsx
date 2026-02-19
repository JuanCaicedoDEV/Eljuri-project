"use client";

import React, { useEffect, useState } from 'react';
import { usePhoneNumberStore, PhoneNumber } from '../store/usePhoneNumberStore';
import { Button } from '../src/components/ui/button';
import PhoneNumberForm from './PhoneNumberForm';

export default function PhoneNumbersManager() {
    const { phoneNumbers, isLoading, error, fetchPhoneNumbers, deletePhoneNumber, updatePhoneNumber } = usePhoneNumberStore();
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPhoneNumbers();
    }, [fetchPhoneNumbers]);

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this phone number?')) {
            await deletePhoneNumber(id);
        }
    };

    const filteredPhoneNumbers = phoneNumbers.filter(pn =>
        pn.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pn.campaignId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'available': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'in-use': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'inactive': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
            {/* Header */}
            <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Phone Numbers</h1>
                            <p className="text-sm text-slate-600 mt-1">Manage phone numbers and campaign assignments</p>
                        </div>
                        <Button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700">
                            + Add Phone Number
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Search Bar */}
                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Search by phone number or campaign..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="text-center py-12">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
                        <p className="mt-4 text-slate-600">Loading phone numbers...</p>
                    </div>
                )}

                {/* Phone Numbers Table */}
                {!isLoading && (
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Phone Number
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Campaign
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Notes
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredPhoneNumbers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            {searchTerm ? 'No phone numbers found matching your search.' : 'No phone numbers yet. Add one to get started.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPhoneNumbers.map((phoneNumber) => (
                                        <tr key={phoneNumber.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-slate-900">{phoneNumber.phoneNumber}</div>
                                                <div className="text-xs text-slate-500">{phoneNumber.id}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-slate-900">
                                                    {phoneNumber.campaignId || <span className="text-slate-400 italic">Unassigned</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(phoneNumber.status)}`}>
                                                    {phoneNumber.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-600 max-w-xs truncate">
                                                    {phoneNumber.notes || <span className="text-slate-400 italic">—</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleDelete(phoneNumber.id)}
                                                    className="text-red-600 hover:text-red-800 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Stats */}
                {!isLoading && phoneNumbers.length > 0 && (
                    <div className="mt-6 grid grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <div className="text-2xl font-bold text-slate-900">{phoneNumbers.length}</div>
                            <div className="text-sm text-slate-600">Total Numbers</div>
                        </div>
                        <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4">
                            <div className="text-2xl font-bold text-emerald-700">
                                {phoneNumbers.filter(pn => pn.status === 'available').length}
                            </div>
                            <div className="text-sm text-emerald-600">Available</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
                            <div className="text-2xl font-bold text-amber-700">
                                {phoneNumbers.filter(pn => pn.status === 'in-use').length}
                            </div>
                            <div className="text-sm text-amber-600">In Use</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                            <div className="text-2xl font-bold text-slate-700">
                                {phoneNumbers.filter(pn => pn.campaignId).length}
                            </div>
                            <div className="text-sm text-slate-600">Assigned</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Form Modal */}
            {showForm && (
                <PhoneNumberForm
                    onClose={() => setShowForm(false)}
                    onSuccess={() => fetchPhoneNumbers()}
                />
            )}
        </div>
    );
}
