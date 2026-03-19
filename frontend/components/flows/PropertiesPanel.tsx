import React from 'react';
import { Node, useReactFlow } from '@xyflow/react';
import { X, Save, Trash2, MessageSquare, Mic } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface PropertiesPanelProps {
    selectedNode: Node | null;
    onClose: () => void;
}

export default function PropertiesPanel({ selectedNode, onClose }: PropertiesPanelProps) {
    // Local state for editing to prevent excessive re-renders on every keystroke
    const [label, setLabel] = React.useState('');
    const [options, setOptions] = React.useState<string[]>([]);
    const { setNodes } = useReactFlow();

    React.useEffect(() => {
        if (selectedNode) {
            // Extract raw text from label if it has prefix
            let text = selectedNode.data.label as string || '';
            if (selectedNode.type === 'speak') text = text.replace('Speak: ', '');
            if (selectedNode.type === 'listen') text = text.replace('Listen for: ', '');
            setLabel(text);

            // Extract options
            setOptions((selectedNode.data.options as string[]) || []);
        }
    }, [selectedNode]);

    const handleSave = () => {
        if (!selectedNode) return;

        setNodes((nodes) =>
            nodes.map((node) => {
                if (node.id === selectedNode.id) {
                    let newLabel = label;
                    if (node.type === 'speak') newLabel = `Speak: ${label}`;
                    if (node.type === 'listen') newLabel = `Listen for: ${label}`;

                    return {
                        ...node,
                        data: {
                            ...node.data,
                            label: newLabel,
                            text: label,   // raw text, used by flowToPrompt
                            options,
                        },
                    };
                }
                return node;
            })
        );
    };

    const handleAddOption = () => {
        setOptions([...options, 'New Option']);
    };

    const handleUpdateOption = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleRemoveOption = (index: number) => {
        setOptions(options.filter((_, i) => i !== index));
    };

    const handleDelete = () => {
        if (!selectedNode) return;
        setNodes((nodes) => nodes.filter((n) => n.id !== selectedNode.id));
        onClose();
    };

    if (!selectedNode) {
        return null;
    }

    const isStartOrEnd = selectedNode.type === 'start' || selectedNode.type === 'end';

    return (
        <div className="absolute right-4 top-4 bottom-4 w-96 bg-white/95 backdrop-blur-2xl border border-zinc-200/50 shadow-2xl rounded-3xl p-6 flex flex-col z-50 animate-in slide-in-from-right-10 fade-in duration-300">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black tracking-tight text-zinc-900 flex items-center gap-2">
                    {selectedNode.type === 'speak' && <MessageSquare size={18} className="text-blue-500" />}
                    {selectedNode.type === 'listen' && <Mic size={18} className="text-purple-500" />}
                    {selectedNode.type === 'start' && 'Start Node'}
                    {selectedNode.type === 'end' && 'End Node'}
                    {selectedNode.type === 'speak' && 'Agent Says'}
                    {selectedNode.type === 'listen' && 'User Says'}
                </h3>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-zinc-100">
                    <X size={16} />
                </Button>
            </div>

            {!isStartOrEnd ? (
                <div className="space-y-6 flex-1 overflow-y-auto pr-2">
                    <div className="space-y-3">
                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                            {selectedNode.type === 'speak' ? 'Response Text' : 'Context Description'}
                        </Label>
                        <Textarea
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder={selectedNode.type === 'speak' ? "Type what the agent should say..." : "Describe what you are listening for generally..."}
                            className="bg-zinc-50 border-zinc-200 focus:ring-primary/20 min-h-[100px] resize-none rounded-xl"
                        />
                        <p className="text-[10px] text-zinc-400">
                            {selectedNode.type === 'speak'
                                ? "Variables can be used like {{name}}."
                                : "This text is for your reference."}
                        </p>
                    </div>

                    {selectedNode.type === 'listen' && (
                        <div className="space-y-3 pt-4 border-t border-zinc-100">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                    Logic Branches
                                </Label>
                                <Button onClick={handleAddOption} variant="outline" size="sm" className="h-6 text-[10px] uppercase font-bold">
                                    + Add Branch
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {options.map((option, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <Input
                                            value={option}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateOption(idx, e.target.value)}
                                            className="h-8 text-xs bg-white"
                                            placeholder="Keyword (e.g., 'Yes')"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveOption(idx)}
                                            className="h-8 w-8 text-zinc-400 hover:text-red-500"
                                        >
                                            <Trash2 size={12} />
                                        </Button>
                                    </div>
                                ))}
                                {options.length === 0 && (
                                    <p className="text-xs text-zinc-400 italic text-center py-2">
                                        No specific branches. Flow will follow the default "Else" path.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-center p-4">
                    <p className="text-sm text-zinc-400">This node has no configurable properties.</p>
                </div>
            )}

            <div className="pt-6 mt-auto border-t border-zinc-100 flex gap-3">
                <Button
                    variant="destructive"
                    onClick={handleDelete}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 shadow-none rounded-xl"
                >
                    <Trash2 size={16} className="mr-2" /> Delete
                </Button>

                {!isStartOrEnd && (
                    <Button
                        onClick={handleSave}
                        className="flex-[2] bg-zinc-900 text-white rounded-xl shadow-lg shadow-zinc-900/20 hover:bg-zinc-800"
                    >
                        <Save size={16} className="mr-2" /> Save Changes
                    </Button>
                )}
            </div>
        </div>
    );
}
