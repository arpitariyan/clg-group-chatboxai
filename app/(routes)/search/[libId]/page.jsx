"use client"

import axios from 'axios';
import { useParams } from 'next/navigation'
import React, { useEffect, useState, createContext, useContext } from 'react'
import DisplayResult from './_components/DisplayResult';
// import { LucideImage, LucideList, LucideSparkles, LucideVideo } from 'lucide-react';

// Create a context for search data
const SearchContext = createContext();

function SearchQueryResult() {

    const { libId } = useParams();
    const [searchInputRecord, setSearchInputRecord] = useState();

    useEffect(() => {
        const parseJsonField = (value, fallback = []) => {
            if (Array.isArray(value) || (value && typeof value === 'object')) return value;
            if (typeof value !== 'string') return fallback;
            try {
                return JSON.parse(value);
            } catch {
                return fallback;
            }
        };

        const toBooleanValue = (value) => value === true || value === 'true' || value === 'liked';

        const normalizeChatDocument = (chat) => ({
            ...chat,
            id: chat.$id || chat.id,
            searchResult: parseJsonField(chat.searchResult, []),
            processedFiles: parseJsonField(chat.processedFiles, []),
            liked: toBooleanValue(chat.liked),
            disliked: toBooleanValue(chat.disliked),
        });

        const GetSearchQueryRecord = async () => {
            try {
                const response = await axios.get(`/api/search/history?libId=${encodeURIComponent(libId)}`);
                let record = response?.data?.record || null;

                if (record && typeof record.uploadedFiles === 'string') {
                    try {
                        record.uploadedFiles = JSON.parse(record.uploadedFiles);
                    } catch {
                        record.uploadedFiles = [];
                    }
                }

                if (record) {
                    record.Chats = (record.Chats || []).map(normalizeChatDocument);
                }

                if (!record) return;

                setSearchInputRecord(record);

                if (typeof window !== 'undefined') {
                    window.searchInputRecord = record;
                    window.dispatchEvent(new CustomEvent('searchDataUpdated', {
                        detail: record
                    }));
                }
            } catch (error) {
                console.error('Error in GetSearchQueryRecord:', error);
            }
        };

        GetSearchQueryRecord();
    }, [libId])


    return (
        <div className="h-full">
            {/* Header content is now handled in LayoutContent.jsx */}
            <div className='h-full px-10 md:px-20 lg:px-36 xl:px-56'>
                <DisplayResult searchInputRecord={searchInputRecord} />
            </div>
        </div>
    )
}

export default SearchQueryResult


