'use client'

import React, { useState, useMemo } from 'react'
import { Download, Share2, X } from 'lucide-react';

function ImageList({ searchResult }) {
    const [selectedImage, setSelectedImage] = useState(null);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    // Filter images and thumbnails from searchResult
    const images = useMemo(() => {
        if (!searchResult?.searchResult) return [];

        const imageList = [];
        searchResult.searchResult.forEach((item, index) => {
            // Add main image if exists
            if (item.image) {
                imageList.push({
                    id: `image-${index}`,
                    url: item.image,
                    thumbnail: item.thumbnail || item.image,
                    title: item.title || 'Image',
                    source: item.url || '#'
                });
            }

            // Add thumbnail if different from main image
            if (item.thumbnail && item.thumbnail !== item.image) {
                imageList.push({
                    id: `thumbnail-${index}`,
                    url: item.thumbnail,
                    thumbnail: item.thumbnail,
                    title: item.title || 'Thumbnail',
                    source: item.url || '#'
                });
            }
        });

        // If no images found from searchResult, show a debug message
        // console.log('Search result structure:', searchResult);
        // console.log('Filtered images:', imageList);

        return imageList;
    }, [searchResult]);

    const openImagePopup = (image) => {
        setSelectedImage(image);
        setIsPopupOpen(true);
    };

    const closeImagePopup = () => {
        setSelectedImage(null);
        setIsPopupOpen(false);
        setCopySuccess(false);
    };

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(selectedImage.url);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (error) {
            console.error('Failed to copy image URL:', error);
        }
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = selectedImage.url;
        link.download = `image-${Date.now()}.jpg`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (images.length === 0) {
        return (
            <div className="mt-5 text-center py-8">
                <div className="bg-gray-100 rounded-lg p-8">
                    <p className="text-gray-500 text-lg mb-2">No images found in search results</p>
                    <p className="text-gray-400 text-sm">Images will appear here when available in the search data</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-5 mb-20">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((image) => (
                    <div
                        key={image.id}
                        className="relative group cursor-pointer rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-200"
                        onClick={() => openImagePopup(image)}
                    >
                        <img
                            src={image.thumbnail}
                            alt={image.title}
                            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                            onError={(e) => {
                                // console.log('Image failed to load:', image.thumbnail);
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDIwMCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iNjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNkI3Mjc5Ij5JbWFnZSBOb3QgRm91bmQ8L3RleHQ+Cjwvc3ZnPgo=';
                            }}
                        />
                        {/* <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <span className="text-gray-500 text-xl bg-opacity-50 px-2 py-1 rounded">
                                    View Image
                                </span>
                            </div>
                        </div> */}
                    </div>
                ))}
            </div>

            {/* Image Popup */}
            {isPopupOpen && selectedImage && (
                <div
                    className="fixed inset-0 bg-opacity-75 flex items-center justify-center z-50 p-3 md:p-4"
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
                    onClick={closeImagePopup}
                >
                    <div
                        className="bg-white rounded-lg max-w-full md:max-w-4xl max-h-[95vh] w-full overflow-hidden flex flex-col md:flex-row shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Image Section */}
                        <div className="flex-1 flex items-center justify-center bg-gray-100 p-2 md:p-4 min-h-[250px] md:min-h-[400px]">
                            <img
                                src={selectedImage.url}
                                alt={selectedImage.title}
                                className="max-w-full object-contain max-h-[40vh] md:max-h-[70vh]"
                                onError={(e) => {
                                    e.target.src = selectedImage.thumbnail;
                                }}
                            />
                        </div>

                        {/* Controls Section */}
                        <div className="w-full md:w-80 bg-white p-4 md:p-6 flex flex-col border-t md:border-t-0 md:border-l border-gray-200">
                            <div className="flex justify-between items-start mb-4 md:mb-6">
                                <h3 className="text-base md:text-lg font-semibold text-gray-800 line-clamp-2 pr-2 flex-1">
                                    {selectedImage.title}
                                </h3>
                                <button
                                    onClick={closeImagePopup}
                                    className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors shrink-0 p-1"
                                >
                                    <X size={20} className="md:w-6 md:h-6" />
                                </button>
                            </div>

                            <div className="space-y-3 md:space-y-4">
                                <button
                                    onClick={handleShare}
                                    className="w-full flex items-center cursor-pointer justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 md:py-3 px-4 rounded-lg transition-colors text-sm md:text-base"
                                >
                                    <Share2 size={16} className="md:w-5 md:h-5" />
                                    {copySuccess ? 'Link Copied!' : 'Share'}
                                </button>

                                <button
                                    onClick={handleDownload}
                                    className="w-full flex items-center cursor-pointer justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 md:py-3 px-4 rounded-lg transition-colors text-sm md:text-base"
                                >
                                    <Download size={16} className="md:w-5 md:h-5" />
                                    Download
                                </button>
                            </div>

                            <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-200">
                                <p className="text-xs md:text-sm text-gray-600 mb-2">Source:</p>
                                <a
                                    href={selectedImage.source}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:text-blue-600 text-xs md:text-sm break-all leading-relaxed"
                                >
                                    {selectedImage.source}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ImageList
