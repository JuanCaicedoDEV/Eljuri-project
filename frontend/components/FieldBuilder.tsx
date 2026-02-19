"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, GripVertical, Settings2, Code, Type, Hash, Binary } from "lucide-react";
import { useSimulationStore } from "../store/useSimulationStore";

interface Field {
    id: string;
    name: string;
    type: "string" | "number" | "boolean" | "list";
    description: string;
}

const TYPE_ICONS = {
    string: Type,
    number: Hash,
    boolean: Binary,
    list: Code,
};

export default function FieldBuilder() {
    const { expectedOutput, setExpectedOutput } = useSimulationStore();
    const [fields, setFields] = useState<Field[]>([]);

    // Parse current schema from store on mount
    useEffect(() => {
        try {
            const parsed = JSON.parse(expectedOutput);
            if (Array.isArray(parsed)) {
                setFields(parsed.map((f: any, i: number) => ({ ...f, id: f.id || `f-${i}` })));
            }
        } catch (e) {
            // Default initial fields if invalid
            setFields([
                { id: "f-1", name: "customer_name", type: "string", description: "The full name of the customer" },
                { id: "f-2", name: "order_intent", type: "string", description: "Primary reason for the call" },
            ]);
        }
    }, []);

    // Sync to store
    const sync = (updated: Field[]) => {
        setFields(updated);
        // Remove IDs before saving to clean API output
        const clean = updated.map(({ id, ...rest }) => rest);
        setExpectedOutput(JSON.stringify(clean, null, 2));
    };

    const addField = () => {
        const newField: Field = {
            id: `f-${Date.now()}`,
            name: "new_field",
            type: "string",
            description: "",
        };
        sync([...fields, newField]);
    };

    const removeField = (id: string) => {
        sync(fields.filter((f) => f.id !== id));
    };

    const updateField = (id: string, updates: Partial<Field>) => {
        sync(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                    <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-widest flex items-center gap-2">
                        <Settings2 size={16} className="text-blue-600" /> Output Protocol
                    </h3>
                    <p className="text-xs text-zinc-400">Define the structured data for API extraction</p>
                </div>
                <button
                    onClick={addField}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-sm"
                >
                    <Plus size={14} /> Add Parameter
                </button>
            </div>

            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {fields.map((field, index) => {
                        const Icon = TYPE_ICONS[field.type];
                        return (
                            <motion.div
                                key={field.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="group flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-zinc-50 border border-zinc-200 rounded-2xl p-4 hover:border-zinc-300 hover:bg-white hover:shadow-md transition-all relative overflow-hidden"
                            >
                                {/* Visual Accent */}
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                                    <div className="p-2 border border-zinc-100 rounded-xl bg-white text-zinc-400 group-hover:text-zinc-600 shadow-sm">
                                        <GripVertical size={16} />
                                    </div>
                                    <input
                                        value={field.name}
                                        onChange={(e) => updateField(field.id, { name: e.target.value })}
                                        className="flex-1 bg-transparent border-none p-0 text-sm font-bold text-zinc-900 focus:ring-0 placeholder:text-zinc-300"
                                        placeholder="field_name"
                                    />
                                </div>

                                <div className="h-6 w-px bg-zinc-200 hidden md:block" />

                                <div className="flex items-center gap-2">
                                    {Object.entries(TYPE_ICONS).map(([type, TIcon]) => (
                                        <button
                                            key={type}
                                            onClick={() => updateField(field.id, { type: type as any })}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${field.type === type
                                                    ? "bg-zinc-950 text-white shadow-lg"
                                                    : "bg-white text-zinc-400 hover:text-zinc-600 border border-zinc-100"
                                                }`}
                                            title={type}
                                        >
                                            <TIcon size={14} />
                                        </button>
                                    ))}
                                </div>

                                <div className="h-6 w-px bg-zinc-200 hidden md:block" />

                                <div className="flex-1 min-w-[300px]">
                                    <input
                                        value={field.description}
                                        onChange={(e) => updateField(field.id, { description: e.target.value })}
                                        className="w-full bg-transparent border-none p-0 text-xs text-zinc-500 focus:ring-0 italic placeholder:text-zinc-300"
                                        placeholder="e.g. Capture the user's spoken sentiment"
                                    />
                                </div>

                                <button
                                    onClick={() => removeField(field.id)}
                                    className="p-2 text-zinc-300 hover:text-rose-500 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {fields.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-zinc-300 border-2 border-dashed border-zinc-100 rounded-[2.5rem]">
                        <Code size={40} className="mb-4 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">No Intelligence Fields Defined</p>
                    </div>
                )}
            </div>
        </div>
    );
}
