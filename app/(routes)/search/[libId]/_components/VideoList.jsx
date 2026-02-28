'use client'

import React, { useState, useMemo } from 'react'
import { Play, ExternalLink, Share2, Download, X } from 'lucide-react';

function VideoList({ searchResult }) {
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    // Filter video URLs from searchResult
    const videos = useMemo(() => {
        if (!searchResult?.searchResult) return [];
        
        const videoList = [];
        searchResult.searchResult.forEach((item, index) => {
            // Check if URL contains video patterns
            const videoPatterns = [
                'youtube.com/watch',
                'youtu.be/',
                'vimeo.com/',
                'dailymotion.com/',
                'twitch.tv/',
                '.mp4',
                '.webm',
                '.avi',
                '.mov',
                'video'
            ];
            
            const isVideo = videoPatterns.some(pattern => 
                item.url?.toLowerCase().includes(pattern.toLowerCase())
            );
            
            if (isVideo) {
                // Extract video ID for YouTube videos
                let videoId = null;
                let embedUrl = null;
                
                if (item.url.includes('youtube.com/watch?v=')) {
                    videoId = item.url.split('v=')[1]?.split('&')[0];
                    embedUrl = `https://www.youtube.com/embed/${videoId}`;
                } else if (item.url.includes('youtu.be/')) {
                    videoId = item.url.split('youtu.be/')[1]?.split('?')[0];
                    embedUrl = `https://www.youtube.com/embed/${videoId}`;
                }
                
                videoList.push({
                    id: `video-${index}`,
                    url: item.url,
                    embedUrl: embedUrl,
                    title: item.title || 'Video',
                    description: item.description || '',
                    thumbnail: item.thumbnail || item.image || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    source: item.name || item.url,
                    isYouTube: item.url.includes('youtube.com') || item.url.includes('youtu.be')
                });
            }
        });
        
        // Debug logging
        // console.log('Search result structure:', searchResult);
        // console.log('Filtered videos:', videoList);
        
        return videoList;
    }, [searchResult]);

    const openVideoPopup = (video) => {
        setSelectedVideo(video);
        setIsPopupOpen(true);
    };

    const closeVideoPopup = () => {
        setSelectedVideo(null);
        setIsPopupOpen(false);
        setCopySuccess(false);
    };

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(selectedVideo.url);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (error) {
            console.error('Failed to copy video URL:', error);
        }
    };

    const handleDownload = () => {
        window.open(selectedVideo.url, '_blank');
    };

    const formatDuration = (duration) => {
        if (!duration) return '';
        // Convert ISO 8601 duration to readable format
        const matches = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        if (!matches) return '';
        
        const hours = matches[1] ? parseInt(matches[1]) : 0;
        const minutes = matches[2] ? parseInt(matches[2]) : 0;
        const seconds = matches[3] ? parseInt(matches[3]) : 0;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (videos.length === 0) {
        return (
            <div className="mt-5 text-center py-8">
                <div className="bg-gray-100 rounded-lg p-8">
                    <p className="text-gray-500 text-lg mb-2">No videos found in search results</p>
                    <p className="text-gray-400 text-sm">Videos will appear here when available in the search data</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-5 mb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map((video) => (
                    <div 
                        key={video.id}
                        className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer"
                        onClick={() => openVideoPopup(video)}
                    >
                        <div className="relative">
                            <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="w-full h-48 object-cover"
                                loading="lazy"
                                onError={(e) => {
                                    // console.log('Video thumbnail failed to load:', video.thumbnail);
                                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDMyMCAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTkyIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjE2MCIgY3k9Ijk2IiByPSIzMiIgZmlsbD0iIzlCOUJBMiIvPgo8cGF0aCBkPSJNMTQ4IDg0TDE3NiA5NkwxNDggMTA4Vjg0WiIgZmlsbD0id2hpdGUiLz4KPHR4dCB4PSIxNjAiIHk9IjE0NCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2QjcyNzkiPlZpZGVvIE5vdCBGb3VuZDwvdHh0Pgo8L3N2Zz4K';
                                }}
                            />
                            <div className="absolute inset-0 bg-opacity-40 flex items-center justify-center">
                                <div className="bg-white bg-opacity-90 rounded-full p-3">
                                    <Play size={24} className="text-gray-800" />
                                </div>
                            </div>
                            {video.isYouTube && (
                                <div className="absolute bottom-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
                                    YouTube
                                </div>
                            )}
                        </div>
                        <div className="p-4">
                            <h3 className="font-medium text-gray-800 line-clamp-2 mb-2">
                                {video.title}
                            </h3>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                {video.description}
                            </p>
                            <p className="text-xs text-gray-500">
                                {video.source}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Video Popup */}
            {isPopupOpen && selectedVideo && (
                <div 
                    className="fixed inset-0 bg-opacity-45 flex items-center justify-center z-50 p-3 md:p-4"
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
                    onClick={closeVideoPopup}
                >
                    <div 
                        className="bg-white rounded-lg max-w-full md:max-w-6xl max-h-[95vh] w-full overflow-hidden flex flex-col md:flex-row shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Video Section */}
                        <div className="flex-1 flex items-center justify-center min-h-[250px] md:min-h-[400px] bg-black">
                            {selectedVideo.embedUrl ? (
                                <iframe
                                    src={selectedVideo.embedUrl}
                                    title={selectedVideo.title}
                                    className="w-full h-64 md:h-96 lg:h-[500px]"
                                    frameBorder="0"
                                    allowFullScreen
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                />
                            ) : (
                                <div className="text-center text-white p-4 md:p-8">
                                    <Play size={48} className="mx-auto mb-4 opacity-50 md:w-16 md:h-16" />
                                    <p className="mb-4 text-sm md:text-base">Video preview not available</p>
                                    <a
                                        href={selectedVideo.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors text-sm md:text-base"
                                    >
                                        <ExternalLink size={16} />
                                        Open in New Tab
                                    </a>
                                </div>
                            )}
                        </div>
                        
                        {/* Controls Section */}
                        <div className="w-full md:w-80 bg-white p-4 md:p-6 flex flex-col border-t md:border-t-0 md:border-l border-gray-200">
                            <div className="flex justify-between items-start mb-4 md:mb-6">
                                <h3 className="text-base md:text-lg font-semibold text-gray-800 line-clamp-3 pr-2 flex-1">
                                    {selectedVideo.title}
                                </h3>
                                <button
                                    onClick={closeVideoPopup}
                                    className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 p-1"
                                >
                                    <X size={20} className="md:w-6 md:h-6" />
                                </button>
                            </div>
                            
                            {selectedVideo.description && (
                                <div className="mb-4 md:mb-6">
                                    <p className="text-xs md:text-sm text-gray-600 line-clamp-4">
                                        {selectedVideo.description}
                                    </p>
                                </div>
                            )}
                            
                            <div className="space-y-3">
                                <button
                                    onClick={handleShare}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 md:py-3 px-4 rounded-lg transition-colors text-sm md:text-base"
                                >
                                    <Share2 size={16} className="md:w-5 md:h-5" />
                                    {copySuccess ? 'Link Copied!' : 'Share'}
                                </button>
                                
                                <a
                                    href={selectedVideo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 md:py-3 px-4 rounded-lg transition-colors text-sm md:text-base"
                                >
                                    <ExternalLink size={16} className="md:w-5 md:h-5" />
                                    <span className="hidden sm:inline">Watch on {selectedVideo.isYouTube ? 'YouTube' : 'Original Site'}</span>
                                    <span className="sm:hidden">Watch</span>
                                </a>
                            </div>
                            
                            <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-200">
                                <p className="text-xs md:text-sm text-gray-600 mb-2">Source:</p>
                                <p className="text-xs md:text-sm text-gray-800 break-all leading-relaxed">
                                    {selectedVideo.source}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default VideoList
