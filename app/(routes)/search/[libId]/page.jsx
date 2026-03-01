"use client"

import { supabase } from '@/services/supabase';
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
        const GetSearchQueryRecord = async () => {
            try {
                let { data: Library, error } = await supabase
                    .from('Library')
                    .select(`
                        *,
                        Chats(*)
                    `)
                    .eq('libId', libId)

                if (error) {
                    console.warn('Error fetching Library from DB, trying localStorage:', error?.message);
                }

                let record = Library?.[0];

                // Fallback: if the DB record is missing (Supabase down/timed out),
                // read the data that ChatBoxAiInput saved in localStorage
                if (!record) {
                    try {
                        const local = localStorage.getItem(`search_${libId}`);
                        if (local) {
                            record = { ...JSON.parse(local), Chats: [] };
                            console.info('[SearchPage] Using localStorage fallback for libId:', libId);
                        }
                    } catch (lsErr) {
                        console.warn('localStorage fallback parse error:', lsErr);
                    }
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


