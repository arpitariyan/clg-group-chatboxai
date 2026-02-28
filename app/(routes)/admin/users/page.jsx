'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Crown,
  Clock,
  Mail,
  User as UserIcon,
  Trash2,
  Ban,
  CheckCircle,
  Edit,
  MoreVertical
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'react-toastify';
import moment from 'moment';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState('all'); // all, free, pro
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const usersPerPage = 20;

  // Modals state
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null });
  const [blockModal, setBlockModal] = useState({ open: false, user: null });
  const [editModal, setEditModal] = useState({ open: false, user: null });
  const [processing, setProcessing] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    plan: 'free',
    credits: 5000,
  });

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchQuery, filterPlan]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: usersPerPage,
        search: searchQuery,
        plan: filterPlan,
      });

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();
      
      setUsers(data.users || []);
      setTotalUsers(data.total || 0);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalUsers / usersPerPage);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (plan) => {
    setFilterPlan(plan);
    setCurrentPage(1);
  };

  const handleDeleteUser = async () => {
    if (!deleteModal.user) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: deleteModal.user.email }),
      });

      if (response.ok) {
        toast.success('User deleted successfully');
        setDeleteModal({ open: false, user: null });
        fetchUsers();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setProcessing(false);
    }
  };

  const handleBlockUser = async () => {
    if (!blockModal.user) return;

    const newBlockStatus = !blockModal.user.is_blocked;
    setProcessing(true);
    try {
      const response = await fetch('/api/admin/block-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: blockModal.user.email,
          block: newBlockStatus 
        }),
      });

      if (response.ok) {
        toast.success(`User ${newBlockStatus ? 'blocked' : 'unblocked'} successfully`);
        setBlockModal({ open: false, user: null });
        fetchUsers();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Failed to update user status');
    } finally {
      setProcessing(false);
    }
  };

  const handleEditUser = async () => {
    if (!editModal.user) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/edit-user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editModal.user.email,
          updates: editForm,
        }),
      });

      if (response.ok) {
        toast.success('User updated successfully');
        setEditModal({ open: false, user: null });
        fetchUsers();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    } finally {
      setProcessing(false);
    }
  };

  const openEditModal = (user) => {
    setEditForm({
      name: user.name || '',
      email: user.email,
      plan: user.plan || 'free',
      credits: user.credits || 5000,
    });
    setEditModal({ open: true, user });
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor all registered users
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{totalUsers}</p>
          <p className="text-sm text-muted-foreground">Total Users</p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="dark:bg-[oklch(0.2478_0_0)]">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={handleSearch}
                className="pl-10"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter: {filterPlan === 'all' ? 'All' : filterPlan === 'pro' ? 'Pro' : 'Free'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Plan Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleFilterChange('all')}>
                  All Users
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange('pro')}>
                  Pro Users Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFilterChange('free')}>
                  Free Users Only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="dark:bg-[oklch(0.2478_0_0)]">
        <CardHeader>
          <CardTitle>User List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">User</th>
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium">Plan</th>
                  <th className="text-left p-4 font-medium">Credits</th>
                  <th className="text-left p-4 font-medium">Last Login</th>
                  <th className="text-left p-4 font-medium">Joined</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(10).fill(0).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </td>
                      <td className="p-4"><Skeleton className="h-4 w-40" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-16" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                    </tr>
                  ))
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-accent/10 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{user.name || 'Unknown'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          {user.email}
                        </div>
                      </td>
                      <td className="p-4">
                        {user.plan === 'pro' ? (
                          <Badge className="bg-linear-to-r from-yellow-500 to-orange-500">
                            <Crown className="w-3 h-3 mr-1" />
                            Pro
                          </Badge>
                        ) : (
                          <Badge variant="outline">Free</Badge>
                        )}
                        {user.is_blocked && (
                          <Badge variant="destructive" className="ml-2">Blocked</Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium">{user.credits?.toLocaleString() || 0}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {user.last_login ? moment(user.last_login).fromNow() : 'Never'}
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-muted-foreground">
                          {user.created_at ? moment(user.created_at).format('MMM D, YYYY') : 'N/A'}
                        </p>
                      </td>
                      <td className="p-4">
                        {user.is_blocked ? (
                          <Badge variant="destructive">
                            <Ban className="w-3 h-3 mr-1" />
                            Blocked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-green-500 text-green-500">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditModal(user)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setBlockModal({ open: true, user })}>
                              {user.is_blocked ? (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Unblock User
                                </>
                              ) : (
                                <>
                                  <Ban className="w-4 h-4 mr-2" />
                                  Block User
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeleteModal({ open: true, user })}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-muted-foreground">
                      No users found
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
                Showing {((currentPage - 1) * usersPerPage) + 1} to {Math.min(currentPage * usersPerPage, totalUsers)} of {totalUsers} users
              </p>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete User Modal */}
      <Dialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ open, user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This will permanently remove all their data, history, and files. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {deleteModal.user && (
            <div className="py-4 space-y-2">
              <p><strong>User:</strong> {deleteModal.user.name || 'Unknown'}</p>
              <p><strong>Email:</strong> {deleteModal.user.email}</p>
              <p><strong>Plan:</strong> {deleteModal.user.plan}</p>
              <p><strong>Credits:</strong> {deleteModal.user.credits?.toLocaleString()}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ open: false, user: null })}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={processing}
            >
              {processing ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block/Unblock User Modal */}
      <Dialog open={blockModal.open} onOpenChange={(open) => setBlockModal({ open, user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{blockModal.user?.is_blocked ? 'Unblock' : 'Block'} User</DialogTitle>
            <DialogDescription>
              {blockModal.user?.is_blocked 
                ? 'This will restore the user\'s access to the application.'
                : 'This will prevent the user from accessing the application.'}
            </DialogDescription>
          </DialogHeader>
          
          {blockModal.user && (
            <div className="py-4 space-y-2">
              <p><strong>User:</strong> {blockModal.user.name || 'Unknown'}</p>
              <p><strong>Email:</strong> {blockModal.user.email}</p>
              <p><strong>Current Status:</strong> {blockModal.user.is_blocked ? 'Blocked' : 'Active'}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBlockModal({ open: false, user: null })}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant={blockModal.user?.is_blocked ? "default" : "destructive"}
              onClick={handleBlockUser}
              disabled={processing}
            >
              {processing ? 'Processing...' : (blockModal.user?.is_blocked ? 'Unblock User' : 'Block User')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={editModal.open} onOpenChange={(open) => setEditModal({ open, user: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="User name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="user@example.com"
                disabled
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Plan</label>
              <select
                value={editForm.plan}
                onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Credits</label>
              <Input
                type="number"
                value={editForm.credits}
                onChange={(e) => setEditForm({ ...editForm, credits: parseInt(e.target.value) || 0 })}
                placeholder="5000"
              />
              <p className="text-xs text-muted-foreground">
                Default: 5000 (Free), 25000 (Pro)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditModal({ open: false, user: null })}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditUser}
              disabled={processing}
            >
              {processing ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
