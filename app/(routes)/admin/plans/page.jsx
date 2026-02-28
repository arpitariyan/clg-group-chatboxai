'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, 
  Crown,
  Calendar,
  Mail,
  UserPlus,
  UserMinus,
  AlertTriangle
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'react-toastify';
import moment from 'moment';

export default function AdminPlansPage() {
  const [proUsers, setProUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [assignEmail, setAssignEmail] = useState('');
  const [assignDuration, setAssignDuration] = useState('30');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchProUsers();
  }, [searchQuery]);

  const fetchProUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: searchQuery });
      const response = await fetch(`/api/admin/pro-users?${params}`);
      const data = await response.json();
      setProUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching pro users:', error);
      toast.error('Failed to fetch pro users');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPlan = async () => {
    if (!assignEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/assign-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: assignEmail,
          duration: parseInt(assignDuration),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Pro plan assigned successfully!');
        setShowAssignModal(false);
        setAssignEmail('');
        setAssignDuration('30');
        fetchProUsers();
      } else {
        toast.error(data.error || 'Failed to assign plan');
      }
    } catch (error) {
      console.error('Error assigning plan:', error);
      toast.error('Failed to assign plan');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelPlan = async () => {
    if (!selectedUser) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/cancel-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selectedUser.email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Pro plan cancelled successfully');
        setShowCancelModal(false);
        setSelectedUser(null);
        fetchProUsers();
      } else {
        toast.error(data.error || 'Failed to cancel plan');
      }
    } catch (error) {
      console.error('Error cancelling plan:', error);
      toast.error('Failed to cancel plan');
    } finally {
      setProcessing(false);
    }
  };

  const filteredUsers = proUsers.filter(user => 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plans Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage Pro subscriptions and assign plans manually
          </p>
        </div>
        <Button onClick={() => setShowAssignModal(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Assign Pro Plan
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="dark:bg-[oklch(0.2478_0_0)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pro Users</CardTitle>
            <Crown className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proUsers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card className="dark:bg-[oklch(0.2478_0_0)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {proUsers.filter(u => {
                if (!u.subscription_end_date) return false;
                const daysLeft = moment(u.subscription_end_date).diff(moment(), 'days');
                return daysLeft <= 7 && daysLeft > 0;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Within 7 days
            </p>
          </CardContent>
        </Card>

        <Card className="dark:bg-[oklch(0.2478_0_0)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manual Assignments</CardTitle>
            <UserPlus className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {proUsers.filter(u => u.is_manual_assignment).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Admin assigned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="dark:bg-[oklch(0.2478_0_0)]">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search pro users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pro Users Table */}
      <Card className="dark:bg-[oklch(0.2478_0_0)]">
        <CardHeader>
          <CardTitle>Pro Users</CardTitle>
          <CardDescription>All users with active Pro subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">User</th>
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium">Subscription Type</th>
                  <th className="text-left p-4 font-medium">Start Date</th>
                  <th className="text-left p-4 font-medium">End Date</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-40" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-20" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-16" /></td>
                      <td className="p-4"><Skeleton className="h-8 w-20" /></td>
                    </tr>
                  ))
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const endDate = user.subscription_end_date ? moment(user.subscription_end_date) : null;
                    const daysLeft = endDate ? endDate.diff(moment(), 'days') : null;
                    const isExpiring = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
                    const isExpired = daysLeft !== null && daysLeft < 0;

                    return (
                      <tr key={user.id} className="border-b hover:bg-accent/50 transition-colors">
                        <td className="p-4">
                          <p className="font-medium">{user.name || 'Unknown'}</p>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            {user.email}
                          </div>
                        </td>
                        <td className="p-4">
                          {user.is_manual_assignment ? (
                            <Badge variant="outline">Manual</Badge>
                          ) : (
                            <Badge>Razorpay</Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {user.subscription_start_date 
                              ? moment(user.subscription_start_date).format('MMM D, YYYY')
                              : 'N/A'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {endDate ? endDate.format('MMM D, YYYY') : 'N/A'}
                          </div>
                          {daysLeft !== null && daysLeft >= 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {daysLeft} days left
                            </p>
                          )}
                        </td>
                        <td className="p-4">
                          {isExpired ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : isExpiring ? (
                            <Badge variant="outline" className="border-orange-500 text-orange-500">
                              Expiring Soon
                            </Badge>
                          ) : (
                            <Badge className="bg-green-500">Active</Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowCancelModal(true);
                            }}
                          >
                            <UserMinus className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-muted-foreground">
                      No pro users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Assign Plan Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Pro Plan</DialogTitle>
            <DialogDescription>
              Manually assign a Pro plan to any user by email
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">User Email</label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={assignEmail}
                onChange={(e) => setAssignEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration (days)</label>
              <Input
                type="number"
                placeholder="30"
                value={assignDuration}
                onChange={(e) => setAssignDuration(e.target.value)}
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                Common values: 30 (1 month), 90 (3 months), 365 (1 year)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleAssignPlan} disabled={processing}>
              {processing ? 'Assigning...' : 'Assign Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Plan Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Pro Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this user's Pro plan?
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="py-4 space-y-2">
              <p><strong>User:</strong> {selectedUser.name || 'Unknown'}</p>
              <p><strong>Email:</strong> {selectedUser.email}</p>
              <p className="text-sm text-muted-foreground mt-4">
                This action will immediately downgrade the user to a Free plan.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelModal(false)} disabled={processing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleCancelPlan} disabled={processing}>
              {processing ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
