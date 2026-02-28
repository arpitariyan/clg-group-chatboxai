// Optimized memoized components to prevent unnecessary re-renders
import React from 'react';
import AnswerDisplay from './AnswerDisplay';
import SourceList from './sourceList';
import ImageList from './ImageList';
import VideoList from './VideoList';

// Memoize the child components to prevent unnecessary re-renders
export const MemoizedAnswerDisplay = React.memo(AnswerDisplay, (prevProps, nextProps) => {
    // Only re-render if the searchResult or loading state actually changes
    return prevProps.searchResult?.id === nextProps.searchResult?.id &&
           prevProps.searchResult?.aiResp === nextProps.searchResult?.aiResp &&
           prevProps.searchResult?.searchResult === nextProps.searchResult?.searchResult &&
           prevProps.isLatestMessage === nextProps.isLatestMessage &&
           prevProps.isLoadingAnswer === nextProps.isLoadingAnswer;
});

export const MemoizedSourceList = React.memo(SourceList, (prevProps, nextProps) => {
    // Only re-render if the searchResult changes
    return prevProps.searchResult?.searchResult === nextProps.searchResult?.searchResult;
});

export const MemoizedImageList = React.memo(ImageList, (prevProps, nextProps) => {
    // Only re-render if the searchResult changes
    return prevProps.searchResult?.searchResult === nextProps.searchResult?.searchResult;
});

export const MemoizedVideoList = React.memo(VideoList, (prevProps, nextProps) => {
    // Only re-render if the searchResult changes
    return prevProps.searchResult?.searchResult === nextProps.searchResult?.searchResult;
});