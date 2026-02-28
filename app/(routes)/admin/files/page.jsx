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
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  Download,
  ChevronLeft,
  ChevronRight
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

export default function AdminFilesPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);
  const [deleteModal, setDeleteModal] = useState({ open: false, file: null });
  const [deleting, setDeleting] = useState(false);
  const filesPerPage = 20;

  useEffect(() => {
    fetchFiles();
  }, [currentPage, searchQuery, typeFilter]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: filesPerPage,
        search: searchQuery,
        type: typeFilter,
      });

      const response = await fetch(`/api/admin/files?${params}`);
      const data = await response.json();
      
      setFiles(data.files || []);
      setTotalFiles(data.total || 0);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.file) return;

    setDeleting(true);
    try {
      const response = await fetch('/api/admin/delete-file', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: deleteModal.file.id }),
      });

      if (response.ok) {
        toast.success('File deleted successfully');
        setDeleteModal({ open: false, file: null });
        fetchFiles();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalFiles / filesPerPage);

  const getFileIcon = (fileType) => {
    if (!fileType) return <File className="w-5 h-5" />;
    
    if (fileType.includes('image')) return <FileImage className="w-5 h-5 text-blue-500" />;
    if (fileType.includes('video')) return <FileVideo className="w-5 h-5 text-purple-500" />;
    if (fileType.includes('audio')) return <FileAudio className="w-5 h-5 text-green-500" />;
    if (fileType.includes('pdf') || fileType.includes('document')) return <FileText className="w-5 h-5 text-red-500" />;
    if (fileType.includes('code') || fileType.includes('text')) return <FileCode className="w-5 h-5 text-orange-500" />;
    
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Files</h1>
          <p className="text-muted-foreground mt-1">
            Manage all uploaded user files
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{totalFiles}</p>
          <p className="text-sm text-muted-foreground">Total Files</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="dark:bg-[oklch(0.2478_0_0)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            <File className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : formatFileSize(files.reduce((acc, f) => acc + (f.size || 0), 0))}
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-[oklch(0.2478_0_0)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Images</CardTitle>
            <FileImage className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : files.filter(f => f.type?.includes('image')).length}
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-[oklch(0.2478_0_0)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : files.filter(f => f.type?.includes('pdf') || f.type?.includes('document')).length}
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-[oklch(0.2478_0_0)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Others</CardTitle>
            <File className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : files.filter(f => !f.type?.includes('image') && !f.type?.includes('pdf') && !f.type?.includes('document')).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card     className="dark:bg-[oklch(0.2478_0_0)]">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by filename or user email..."
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
                <DropdownMenuLabel>File Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setTypeFilter('all'); setCurrentPage(1); }}>
                  All Files
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setTypeFilter('image'); setCurrentPage(1); }}>
                  Images Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setTypeFilter('document'); setCurrentPage(1); }}>
                  Documents Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setTypeFilter('video'); setCurrentPage(1); }}>
                  Videos Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setTypeFilter('audio'); setCurrentPage(1); }}>
                  Audio Only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Files Table */}
      <Card className="dark:bg-[oklch(0.2478_0_0)]">
        <CardHeader>
          <CardTitle>Uploaded Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">File</th>
                  <th className="text-left p-4 font-medium">User</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Size</th>
                  <th className="text-left p-4 font-medium">Uploaded</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(10).fill(0).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                      </td>
                      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-20" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-8 w-20" /></td>
                    </tr>
                  ))
                ) : files.length > 0 ? (
                  files.map((file) => (
                    <tr key={file.id} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-accent rounded">
                            {getFileIcon(file.type)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-xs">{file.name || 'Untitled'}</p>
                            <p className="text-xs text-muted-foreground truncate">{file.path}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm">{file.user_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{file.user_email}</p>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">
                          {file.type?.split('/')[1] || 'Unknown'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium">{formatFileSize(file.size)}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-muted-foreground">
                          {moment(file.created_at).format('MMM D, YYYY')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {moment(file.created_at).format('h:mm A')}
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {file.url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(file.url, '_blank')}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteModal({ open: true, file })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-muted-foreground">
                      No files found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * filesPerPage) + 1} to {Math.min(currentPage * filesPerPage, totalFiles)} of {totalFiles} files
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
      <Dialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ open, file: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this file? This will remove it from both the database and storage. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {deleteModal.file && (
            <div className="py-4 space-y-2">
              <p><strong>File:</strong> {deleteModal.file.name}</p>
              <p><strong>Type:</strong> {deleteModal.file.type}</p>
              <p><strong>Size:</strong> {formatFileSize(deleteModal.file.size)}</p>
              <p><strong>User:</strong> {deleteModal.file.user_email}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ open: false, file: null })}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete File'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
