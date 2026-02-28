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
                // This query fetches Library records and their related Chats
                // Chats(*) means: fetch ALL columns from the related Chats table
                let { data: Library, error } = await supabase
                    .from('Library')
                    .select(`
                        *,
                        Chats(*)
                    `)
                    .eq('libId', libId)

                if (error) {
                    console.error('Error fetching data:', error);
                    return;
                }

                // console.log(Library[0]);
                setSearchInputRecord(Library[0]);

                // Set the search data in a global way that the header can access
                if (typeof window !== 'undefined' && Library[0]) {
                    window.searchInputRecord = Library[0];
                    // Dispatch a custom event to notify the header
                    window.dispatchEvent(new CustomEvent('searchDataUpdated', {
                        detail: Library[0]
                    }));
                }
            } catch (error) {
                console.error('Error in GetSearchQueryRecord:', error);
            }
        };

        GetSearchQueryRecord();
    }, [libId]) // Added libId as dependency

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


