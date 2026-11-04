'use client'

import { createContext, useContext, useState, useEffect } from 'react';
import { AIModelsOption, DEEP_RESEARCH_MODELS } from '@/services/Shared';

export const EFFORT_LEVELS = [
    {
        id: 'auto',
        label: 'Auto (Adaptive)',
        shortLabel: 'Auto',
        tag: 'Adaptive',
        desc: 'Dynamically scales thinking depth based on query complexity',
        icon: 'Sparkles',
        color: 'text-violet-500 dark:text-violet-400',
        dotColor: 'bg-violet-500',
        badge: 'Recommended'
    },
    {
        id: 'low',
        label: 'Low Effort',
        shortLabel: 'Low',
        tag: 'Fast',
        desc: 'Fastest response, minimal token overhead for simple questions',
        icon: 'Zap',
        color: 'text-emerald-500 dark:text-emerald-400',
        dotColor: 'bg-emerald-500',
    },
    {
        id: 'medium',
        label: 'Medium Effort',
        shortLabel: 'Med',
        tag: 'Balanced',
        desc: 'Standard balanced reasoning with quality & factual evaluation',
        icon: 'Activity',
        color: 'text-blue-500 dark:text-blue-400',
        dotColor: 'bg-blue-500',
    },
    {
        id: 'high',
        label: 'High Effort',
        shortLabel: 'High',
        tag: 'Deep',
        desc: 'Deep reasoning, code checks, and self-refinement passes',
        icon: 'Brain',
        color: 'text-purple-500 dark:text-purple-400',
        dotColor: 'bg-purple-500',
    },
    {
        id: 'max',
        label: 'Max Think',
        shortLabel: 'Max',
        tag: 'Deep Gate',
        desc: 'Architectural planning, multi-pass critic, and strict quality gate',
        icon: 'Atom',
        color: 'text-rose-500 dark:text-rose-400',
        dotColor: 'bg-rose-500',
        badge: 'Max Think'
    },
];

const ModelContext = createContext();

export const useModel = () => {
    const context = useContext(ModelContext);
    if (!context) {
        throw new Error('useModel must be used within a ModelProvider');
    }
    return context;
};

export const ModelProvider = ({ children }) => {
    // Default to "Best" option (first in the array)
    const [selectedModel, setSelectedModel] = useState(AIModelsOption[0]);
    // Effort level state ('auto' | 'low' | 'medium' | 'high' | 'max')
    const [effortLevel, setEffortLevelState] = useState('auto');

    useEffect(() => {
        try {
            const saved = localStorage.getItem('chatbox_reasoning_effort');
            if (saved && ['auto', 'low', 'medium', 'high', 'max'].includes(saved)) {
                setEffortLevelState(saved);
            }
        } catch {
            // Ignore storage errors in SSR or private mode
        }
    }, []);

    const setEffortLevel = (level) => {
        if (['auto', 'low', 'medium', 'high', 'max'].includes(level)) {
            setEffortLevelState(level);
            try {
                localStorage.setItem('chatbox_reasoning_effort', level);
            } catch {
                // Ignore storage errors
            }
        }
    };

    const updateSelectedModel = (modelId) => {
        // Search in both standard and research pools
        const model = [...AIModelsOption, ...DEEP_RESEARCH_MODELS].find(m => m.id === modelId);
        if (model) {
            setSelectedModel(model);
        }
    };

    return (
        <ModelContext.Provider value={{
            selectedModel,
            setSelectedModel,
            updateSelectedModel,
            availableModels: [...AIModelsOption, ...DEEP_RESEARCH_MODELS],
            effortLevel,
            setEffortLevel,
            EFFORT_LEVELS,
        }}>
            {children}
        </ModelContext.Provider>
    );
};