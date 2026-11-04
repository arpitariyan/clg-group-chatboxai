"use client"

import axios from 'axios';
import { useParams } from 'next/navigation'
import React, { useEffect, useState, createContext, useContext, useCallback } from 'react'
import DisplayResult from './_components/DisplayResult';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { Spinner } from "@/components/ui/spinner";
// import { LucideImage, LucideList, LucideSparkles, LucideVideo } from '@/components/ui/animated-icon';

// Create a context for search data
const SearchContext = createContext();

function SearchQueryResult() {

    const { libId } = useParams();
    const [searchInputRecord, setSearchInputRecord] = useState();
    const [isLoading, setIsLoading] = useState(true);
    const { memoryEnabled } = useUser();
    const { currentUser } = useAuth();

    useEffect(() => {
        const parseJsonArrayField = (value, fallback = []) => {
            if (Array.isArray(value)) return value;
            if (!value) return fallback;
            if (typeof value === 'string') {
                const trimmed = value.trim();
                if (!trimmed) return fallback;
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) return parsed;
                    if (parsed && typeof parsed === 'object') {
                        if (Array.isArray(parsed.results)) return parsed.results;
                        if (Array.isArray(parsed.items)) return parsed.items;
                        if (Array.isArray(parsed.web)) return parsed.web;
                        if (Array.isArray(parsed.data)) return parsed.data;
                        if (Array.isArray(parsed.sources)) return parsed.sources;
                    }
                    return fallback;
                } catch {
                    return fallback;
                }
            }
            if (typeof value === 'object') {
                if (Array.isArray(value.results)) return value.results;
                if (Array.isArray(value.items)) return value.items;
                if (Array.isArray(value.web)) return value.web;
                if (Array.isArray(value.data)) return value.data;
                if (Array.isArray(value.sources)) return value.sources;
                return fallback;
            }
            return fallback;
        };

        const toBooleanValue = (value) => value === true || value === 'true' || value === 'liked';

        const normalizeChatDocument = (chat) => ({
            ...chat,
            id: chat.$id || chat.id,
            searchResult: parseJsonArrayField(chat.searchResult, []),
            processedFiles: parseJsonArrayField(chat.processedFiles, []),
            liked: toBooleanValue(chat.liked),
            disliked: toBooleanValue(chat.disliked),
        });

        const GetSearchQueryRecord = async () => {
            setIsLoading(true);
            try {
                // Attach auth token so the server can verify the request without
                // hitting Firebase's token verification endpoint with an empty token
                // (which causes 429 rate-limit errors)
                let token = null;
                try {
                    const user = currentUser || auth?.currentUser;
                    token = await user?.getIdToken?.();
                } catch {
                    token = null;
                }

                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const response = await axios.get(`/api/search/history?libId=${encodeURIComponent(libId)}`, { headers });
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
                if (error?.response?.status === 401) {
                    console.warn('[GetSearchQueryRecord] Unauthorized (401). User session may be unauthenticated or expired.');
                } else {
                    console.error('Error in GetSearchQueryRecord:', error);
                }
            } finally {
                setIsLoading(false);
            }
        };

        GetSearchQueryRecord();
    }, [libId, currentUser])

    if (isLoading) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center">
                <Spinner className="size-8 text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="h-full">
            {/* Header content is now handled in LayoutContent.jsx */}
            <div className='h-full px-2 sm:px-4 md:px-20 lg:px-36 xl:px-56'>
                <DisplayResult searchInputRecord={searchInputRecord} memoryEnabled={memoryEnabled} />
            </div>
        </div>
    )
}

export default SearchQueryResult


