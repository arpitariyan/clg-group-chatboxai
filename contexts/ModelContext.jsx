'use client'

import { createContext, useContext, useState } from 'react';
import { AIModelsOption } from '@/services/Shared';

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

    const updateSelectedModel = (modelId) => {
        const model = AIModelsOption.find(m => m.id === modelId);
        if (model) {
            setSelectedModel(model);
        }
    };

    return (
        <ModelContext.Provider value={{
            selectedModel,
            setSelectedModel,
            updateSelectedModel,
            availableModels: AIModelsOption
        }}>
            {children}
        </ModelContext.Provider>
    );
};