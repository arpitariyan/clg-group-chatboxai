'use client'

import axios from 'axios';
import { Activity, Cpu, DollarSign, Globe, Star, Volleyball, Palette, Clock, ExternalLink, Calendar, TrendingUp, RotateCw, AlertCircle } from 'lucide-react'
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'


const options = [
    {
        title: 'Top',
        icon: Star,
        searchQuery: "Today's Top News"
    },
    {
        title: 'Tech & Science',
        icon: Cpu,
        searchQuery: 'Technology and Science Latest News'
    },
    {
        title: 'Finance',
        icon: TrendingUp,
        searchQuery: 'Finance and Business Latest News'
    },
    {
        title: 'Art & Culture',
        icon: Palette,
        searchQuery: 'Art Culture Entertainment Latest News'
    },
    {
        title: 'Sports',
        icon: Volleyball,
        searchQuery: 'Sports Latest News'
    }
]

function Discover() {

    const [selectedOption, setSelectedOption] = useState('Top');
    const [latestNews, setLatestNews] = useState([]);
    const [allCategoriesNews, setAllCategoriesNews] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const refreshIntervalRef = useRef(null);
    const refreshTimerRef = useRef(null);

    // Initialize news data and set up auto-refresh
    useEffect(() => {
        loadNewsData();
        
        // Set up 24-hour auto-refresh
        const setupAutoRefresh = () => {
            // Clear any existing timers
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
            
            // Schedule refresh after 24 hours
            refreshTimerRef.current = setTimeout(() => {
                console.log('Auto-refreshing news after 24 hours');
                loadNewsData();
                setupAutoRefresh(); // Re-setup for next 24 hours
            }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
        };
        
        setupAutoRefresh();
        
        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
        };
    }, []);

    // Handle category changes
    useEffect(() => {
        displayCategoryNews(selectedOption);
    }, [selectedOption]);

    // Load news data from cache or fetch fresh
    const loadNewsData = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Check for cached data
            const cachedData = localStorage.getItem('newsData');
            const cachedTimestamp = localStorage.getItem('newsTimestamp');
            
            if (cachedData && cachedTimestamp) {
                const timeDiff = Date.now() - parseInt(cachedTimestamp);
                const hoursDiff = timeDiff / (1000 * 60 * 60);
                
                // Use cached data if less than 24 hours old
                if (hoursDiff < 24) {
                    console.log('Using cached news data');
                    const parsedData = JSON.parse(cachedData);
                    setAllCategoriesNews(parsedData);
                    setLastRefresh(new Date(parseInt(cachedTimestamp)));
                    displayCategoryNews(selectedOption, parsedData);
                    setLoading(false);
                    return;
                }
            }
            
            // Fetch fresh data if no cache or cache is old
            console.log('Fetching fresh news data');
            await fetchAllCategoriesNews();
            
        } catch (err) {
            console.error('Error loading news data:', err);
            setError('Failed to load news. Please try again.');
            setLoading(false);
        }
    }, [selectedOption]);

    // Fetch news for all categories
    const fetchAllCategoriesNews = async () => {
        try {
            const categoriesWithoutTop = options.filter(opt => opt.title !== 'Top');
            const newsPromises = categoriesWithoutTop.map(category => 
                fetchCategoryNews(category.title, category.searchQuery, false)
            );
            
            const results = await Promise.allSettled(newsPromises);
            const newsData = {};
            let combinedNews = [];
            
            categoriesWithoutTop.forEach((category, index) => {
                if (results[index].status === 'fulfilled' && results[index].value.length > 0) {
                    newsData[category.title] = results[index].value;
                    combinedNews = [...combinedNews, ...results[index].value];
                    console.log(`Loaded ${results[index].value.length} articles for ${category.title}`);
                } else {
                    newsData[category.title] = [];
                    console.warn(`Failed to load ${category.title}`);
                }
            });
            
            // Sort combined news by date (newest first)
            combinedNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
            
            setAllCategoriesNews(newsData);
            setLatestNews(combinedNews);
            setLastRefresh(new Date());
            
            // Cache the data with timestamp
            localStorage.setItem('newsData', JSON.stringify(newsData));
            localStorage.setItem('newsTimestamp', Date.now().toString());
            
            setLoading(false);
            
        } catch (err) {
            console.error('Error fetching all categories:', err);
            setError('Failed to load news. Please try again later.');
            setLoading(false);
        }
    };

    // Fetch news for a specific category
    const fetchCategoryNews = async (category, searchQuery, shouldUpdateState = false) => {
        try {
            // Fetch worldwide news
            const worldwideResponse = await axios.post('/api/search', {
                searchInput: searchQuery,
                searchType: 'search',
                region: 'us'
            });
            
            let newsData = worldwideResponse.data.results || [];
            
            // If only 2 results or less, also fetch Indian news to get more coverage
            if (newsData.length < 5) {
                try {
                    const indiaResponse = await axios.post('/api/search', {
                        searchInput: `${searchQuery} India`,
                        searchType: 'search',
                        region: 'in'
                    });
                    
                    const indiaNews = indiaResponse.data.results || [];
                    // Combine and deduplicate by link
                    const allNews = [...newsData, ...indiaNews];
                    const uniqueNews = [];
                    const seenLinks = new Set();
                    
                    for (const article of allNews) {
                        if (!seenLinks.has(article.link)) {
                            seenLinks.add(article.link);
                            uniqueNews.push(article);
                        }
                    }
                    
                    newsData = uniqueNews.slice(0, 15); // Limit to 15 articles
                    console.log(`Combined ${newsData.length} articles from worldwide and India for ${category}`);
                } catch (indiaError) {
                    console.warn(`Failed to fetch India-specific news for ${category}:`, indiaError.message);
                    // Continue with just worldwide news
                }
            }
            
            // Ensure proper categorization
            newsData = newsData.map(article => ({
                ...article,
                category: category,
                categorySlug: category.toLowerCase().replace(/\s+/g, '-')
            }));
            
            if (shouldUpdateState) {
                setLatestNews(newsData);
                setLastRefresh(new Date());
                setAllCategoriesNews(prev => ({
                    ...prev,
                    [category]: newsData
                }));
                setLoading(false);
            }
            
            return newsData;

        } catch (err) {
            console.error(`Error fetching ${category} news:`, err);
            if (shouldUpdateState) {
                setError(`Failed to load ${category} news. Please try again.`);
                setLatestNews([]);
                setLoading(false);
            }
            return [];
        }
    };

    // Display news for selected category
    const displayCategoryNews = useCallback((category, dataSource = null) => {
        const newsToDisplay = dataSource ? dataSource[category] : allCategoriesNews[category];
        
        if (category === 'Top') {
            // Combine and sort all categories
            const combinedNews = Object.values(dataSource || allCategoriesNews)
                .flat()
                .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
            setLatestNews(combinedNews);
        } else if (newsToDisplay && newsToDisplay.length > 0) {
            setLatestNews(newsToDisplay);
        } else {
            setLatestNews([]);
        }
    }, [allCategoriesNews]);

    // Manual refresh handler
    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        setError(null);
        
        try {
            if (selectedOption === 'Top') {
                await fetchAllCategoriesNews();
            } else {
                const categoryOption = options.find(opt => opt.title === selectedOption);
                if (categoryOption) {
                    const newsData = await fetchCategoryNews(
                        selectedOption, 
                        categoryOption.searchQuery, 
                        true
                    );
                    setAllCategoriesNews(prev => ({
                        ...prev,
                        [selectedOption]: newsData
                    }));
                }
            }
            
            // Reset the 24-hour timer when user manually refreshes
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
            refreshTimerRef.current = setTimeout(() => {
                console.log('Auto-refreshing news after 24 hours (from last manual refresh)');
                loadNewsData();
            }, 24 * 60 * 60 * 1000);
            
        } catch (err) {
            console.error('Error during manual refresh:', err);
            setError('Failed to refresh news. Please try again.');
        } finally {
            setIsRefreshing(false);
        }
    };

    const formatDate = (dateString) => {
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Recently';
        }
    };

    const NewsCard = ({ article }) => (
        <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-full">
            <CardContent className="p-0">
                {article.image && (
                    <div className="relative overflow-hidden rounded-t-lg">
                        <img 
                            src={article.image} 
                            alt={article.title}
                            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                        <div className="absolute top-3 left-3">
                            <Badge variant="secondary" className="bg-black/70 text-white font-medium">
                                {article.category || 'News'}
                            </Badge>
                        </div>
                    </div>
                )}
                
                <div className="p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(article.publishedAt)}</span>
                        <span>•</span>
                        <span className="font-medium truncate">{article.source}</span>
                        {!article.image && (
                            <>
                                <span>•</span>
                                <Badge variant="outline" className="text-xs">
                                    {article.category || 'News'}
                                </Badge>
                            </>
                        )}
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {article.title}
                    </h3>
                    
                    <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                        {article.snippet}
                    </p>
                    
                    <div className="flex items-center justify-between">
                        <a 
                            href={article.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm font-medium"
                            onClick={(e) => e.stopPropagation()}
                        >
                            Read More
                            <ExternalLink className="w-4 h-4" />
                        </a>
                        
                        <Badge variant="outline" className="text-xs truncate">
                            {article.displayLink}
                        </Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    const LoadingCard = () => (
        <Card className="h-full">
            <CardContent className="p-0">
                <Skeleton className="w-full h-48 rounded-t-lg" />
                <div className="p-4 space-y-3">
                    <div className="flex gap-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="flex justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );



    return (
        <div className='min-h-screen overflow-y-auto px-4 md:px-10 lg:px-20 xl:px-32 py-8'>
            {/* Header with Refresh Button */}
            <div className="mb-8">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className='text-3xl font-bold mb-2'>Discover</h2>
                        <p className="text-muted-foreground">Stay updated with the latest worldwide and Indian news</p>
                    </div>
                    <Button
                        onClick={handleManualRefresh}
                        disabled={loading || isRefreshing}
                        className="flex items-center gap-2 whitespace-nowrap"
                        variant="outline"
                    >
                        <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>{isRefreshing ? 'Refreshing...' : 'Refresh News'}</span>
                    </Button>
                </div>
                
                {lastRefresh && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                        <Clock className="w-4 h-4" />
                        <span>Last updated: {formatDate(lastRefresh)}</span>
                        <span className="text-xs">(Auto-refreshes every 24 hours)</span>
                    </div>
                )}
            </div>

            {/* Category Tabs */}
            <div className='flex items-center gap-4 mb-8 overflow-x-auto pb-2'>
                {options.map((option, index) => (
                    <div 
                        key={index}
                        onClick={() => setSelectedOption(option.title)}
                        className={`flex items-center gap-2 rounded-full px-4 py-2 cursor-pointer transition-all duration-200 whitespace-nowrap ${
                            selectedOption === option.title 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <option.icon className='w-4 h-4' />
                        <h2 className="font-medium">{option.title}</h2>
                    </div>
                ))}
            </div>

            {/* Error State */}
            {error && (
                <Card className="border-destructive/50 bg-destructive/5 mb-6">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Content Header */}
            <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">
                    {selectedOption === 'Top' ? "Today's Top Stories" : `${selectedOption} News`}
                </h3>
                <p className="text-muted-foreground text-sm">
                    {loading 
                        ? "Loading latest news..." 
                        : isRefreshing
                            ? "Refreshing news..."
                            : `${latestNews.length} articles found`
                    }
                </p>
            </div>

            {/* News Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    // Loading skeletons
                    Array.from({ length: 6 }).map((_, index) => (
                        <LoadingCard key={index} />
                    ))
                ) : latestNews.length > 0 ? (
                    // News articles
                    latestNews.map((article, index) => (
                        <NewsCard 
                            key={`${article.category}-${article.link}-${index}`} 
                            article={article} 
                        />
                    ))
                ) : (
                    // Empty state
                    <div className="col-span-full">
                        <Card className="border-dashed">
                            <CardContent className="p-12 text-center">
                                <Globe className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="font-semibold mb-2">No news found</h3>
                                <p className="text-muted-foreground mb-4">
                                    Try refreshing or check back later for the latest updates.
                                </p>
                                <Button
                                    onClick={handleManualRefresh}
                                    disabled={loading || isRefreshing}
                                    className="flex items-center gap-2 mx-auto"
                                >
                                    <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    {isRefreshing ? 'Refreshing...' : 'Refresh News'}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* News Summary Footer */}
            {!loading && latestNews.length > 0 && (
                <div className="mt-8 text-center">
                    <Card className="bg-muted/50">
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">
                                Showing {latestNews.length} latest articles for {selectedOption === 'Top' ? 'all categories (worldwide & India)' : `${selectedOption.toLowerCase()} (worldwide & India)`}
                                <span className="block mt-1">
                                    Click "Refresh News" to update immediately, or wait for automatic refresh in 24 hours
                                </span>
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )

}

export default Discover
