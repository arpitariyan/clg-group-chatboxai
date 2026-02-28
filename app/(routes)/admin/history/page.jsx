'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Trash2,
  Image as ImageIcon,
  SearchIcon,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'react-toastify';
import moment from 'moment';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, search, research, image
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchHistory();
  }, [currentPage, searchQuery, typeFilter]);

  useEffect(() => {
    // Clear selection when page or filters change
    setSelectedItems([]);
  }, [currentPage, searchQuery, typeFilter]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        type: typeFilter,
      });

      const response = await fetch(`/api/admin/history?${params}`);
      const data = await response.json();
      
      setHistory(data.history || []);
      setTotalItems(data.total || 0);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.item) return;

    setDeleting(true);
    try {
      const response = await fetch('/api/admin/delete-history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: deleteModal.item.id,
          type: deleteModal.item.type,
        }),
      });

      if (response.ok) {
        toast.success('History entry deleted successfully');
        setDeleteModal({ open: false, item: null });
        fetchHistory();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete history entry');
      }
    } catch (error) {
      console.error('Error deleting history:', error);
      toast.error('Failed to delete history entry');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;

    setBulkDeleting(true);
    try {
      const response = await fetch('/api/admin/bulk-delete-history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedItems.map(item => ({ id: item.id, type: item.type })),
        }),
      });

      if (response.ok) {
        toast.success(`${selectedItems.length} entries deleted successfully`);
        setBulkDeleteModal(false);
        setSelectedItems([]);
        fetchHistory();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete entries');
      }
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error('Failed to delete entries');
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === history.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems([...history]);
    }
  };

  const toggleSelectItem = (item) => {
    const isSelected = selectedItems.some(selected => selected.id === item.id);
    if (isSelected) {
      setSelectedItems(selectedItems.filter(selected => selected.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const isItemSelected = (item) => {
    return selectedItems.some(selected => selected.id === item.id);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'search':
        return <SearchIcon className="w-4 h-4" />;
      case 'research':
        return <FileText className="w-4 h-4" />;
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTypeBadge = (type) => {
    const configs = {
      search: { label: 'Search', className: 'bg-blue-500' },
      research: { label: 'Research', className: 'bg-purple-500' },
      image: { label: 'Image Gen', className: 'bg-pink-500' },
    };
    
    const config = configs[type] || { label: type, className: '' };
    return (
      <Badge className={config.className}>
        {getTypeIcon(type)}
        <span className="ml-1">{config.label}</span>
      </Badge>
    );
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">History</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all user activities
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{totalItems}</p>
          <p className="text-sm text-muted-foreground">Total Entries</p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="dark:bg-[oklch(0.2478_0_0)]">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by user email or content..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Type: {typeFilter === 'all' ? 'All' : typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Activity Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setTypeFilter('all'); setCurrentPage(1); }}>
                  All Activities
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setTypeFilter('search'); setCurrentPage(1); }}>
                  Searches Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setTypeFilter('research'); setCurrentPage(1); }}>
                  Research Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setTypeFilter('image'); setCurrentPage(1); }}>
                  Image Generation Only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {selectedItems.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setBulkDeleteModal(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected ({selectedItems.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card className="dark:bg-[oklch(0.2478_0_0)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Activity Log</CardTitle>
            {history.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
              >
                {selectedItems.length === history.length ? (
                  <>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Select All
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              Array(10).fill(0).map((_, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))
            ) : history.length > 0 ? (
              history.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    isItemSelected(item) ? 'bg-accent border-primary' : 'hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleSelectItem(item)}
                        className="mt-1 shrink-0"
                      >
                        {isItemSelected(item) ? (
                          <CheckSquare className="w-5 h-5 text-primary" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {getTypeBadge(item.type)}
                          <span className="text-sm text-muted-foreground">
                            {moment(item.created_at).format('MMM D, YYYY h:mm A')}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">User</p>
                            <p className="text-sm font-medium">{item.user_name || 'Unknown'} ({item.user_email})</p>
                          </div>
                          
                          <div>
                            <p className="text-xs text-muted-foreground">Input</p>
                            <p className="text-sm">{item.input || 'N/A'}</p>
                          </div>
                          
                          {item.result && (
                            <div>
                              <p className="text-xs text-muted-foreground">Result</p>
                              <p className="text-sm line-clamp-3">{item.result}</p>
                            </div>
                          )}

                          {item.image_url && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Generated Image</p>
                              <img 
                                src={item.image_url} 
                                alt="Generated" 
                                className="max-w-xs rounded-lg border"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteModal({ open: true, item })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No history entries found</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
              </p>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={i}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ open, item: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete History Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this history entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {deleteModal.item && (
            <div className="py-4 space-y-2">
              <p><strong>Type:</strong> {deleteModal.item.type}</p>
              <p><strong>User:</strong> {deleteModal.item.user_email}</p>
              <p><strong>Date:</strong> {moment(deleteModal.item.created_at).format('MMM D, YYYY h:mm A')}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ open: false, item: null })}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Modal */}
      <Dialog open={bulkDeleteModal} onOpenChange={setBulkDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Multiple Entries</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedItems.length} selected {selectedItems.length === 1 ? 'entry' : 'entries'}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-2 max-h-96 overflow-y-auto">
            <p className="font-semibold mb-2">Selected Entries:</p>
            {selectedItems.map(item => (
              <div key={item.id} className="p-2 bg-accent rounded text-sm">
                <p><strong>Type:</strong> {item.type}</p>
                <p><strong>User:</strong> {item.user_email}</p>
                <p><strong>Date:</strong> {moment(item.created_at).format('MMM D, YYYY h:mm A')}</p>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteModal(false)}
              disabled={bulkDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? 'Deleting...' : `Delete ${selectedItems.length} ${selectedItems.length === 1 ? 'Entry' : 'Entries'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
