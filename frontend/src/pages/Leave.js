import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, Check, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const Leave = () => {
  const [myRequests, setMyRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [user] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [formData, setFormData] = useState({
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: '',
  });

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      const myRes = await axios.get(`${API}/leave/my-requests`, getAuthHeader());
      setMyRequests(myRes.data);

      if (user.role === 'admin' || user.role === 'coordinator') {
        const allRes = await axios.get(`${API}/leave/requests`, getAuthHeader());
        setAllRequests(allRes.data);
      }
    } catch (error) {
      toast.error('Failed to load leave requests');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/leave/request`, formData, getAuthHeader());
      toast.success('Leave request submitted successfully');
      fetchLeaveRequests();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit request');
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await axios.put(`${API}/leave/${requestId}/approve`, {}, getAuthHeader());
      toast.success('Leave request approved');
      fetchLeaveRequests();
    } catch (error) {
      toast.error('Failed to approve request');
    }
  };

  const handleReject = async (requestId) => {
    if (!window.confirm('Are you sure you want to reject this leave request?')) return;
    try {
      await axios.put(`${API}/leave/${requestId}/reject`, {}, getAuthHeader());
      toast.success('Leave request rejected');
      fetchLeaveRequests();
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const resetForm = () => {
    setFormData({
      leave_type: 'annual',
      start_date: '',
      end_date: '',
      reason: '',
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-50 text-amber-700 border-amber-100',
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      rejected: 'bg-rose-50 text-rose-700 border-rose-100',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}>
        {status}
      </span>
    );
  };

  const getLeaveTypeBadge = (type) => {
    const icons = {
      annual: '🏖️',
      sick: '🤒',
      personal: '👤',
      unpaid: '💼',
      carer: '❤️',
    };
    return (
      <span className="flex items-center gap-2">
        <span>{icons[type] || '📅'}</span>
        <span className="capitalize">{type}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6" data-testid="leave-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Leave Management</h1>
          <p className="text-slate-600">Submit and manage leave requests</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="request-leave-button">
              <Plus className="w-4 h-4 mr-2" />
              Request Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Submit Leave Request</DialogTitle>
              <DialogDescription>Fill in the details for your leave request</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="leave_type">Leave Type *</Label>
                  <Select
                    value={formData.leave_type}
                    onValueChange={(value) => setFormData({ ...formData, leave_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">🏖️ Annual Leave</SelectItem>
                      <SelectItem value="sick">🤒 Sick Leave</SelectItem>
                      <SelectItem value="personal">👤 Personal Leave</SelectItem>
                      <SelectItem value="unpaid">💼 Unpaid Leave</SelectItem>
                      <SelectItem value="carer">❤️ Carer's Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="reason">Reason *</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Please provide a reason for your leave request..."
                    rows={4}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">Submit Request</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="my-requests" className="w-full">
        <TabsList>
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          {(user.role === 'admin' || user.role === 'coordinator') && (
            <TabsTrigger value="all-requests">All Requests</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-requests">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-manrope font-semibold">My Leave Requests</h2>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading requests...</div>
              ) : myRequests.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No leave requests yet. Submit your first request above.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reviewed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myRequests.map((request) => (
                      <TableRow key={request.id} className="table-row">
                        <TableCell>{getLeaveTypeBadge(request.leave_type)}</TableCell>
                        <TableCell>{request.start_date}</TableCell>
                        <TableCell>{request.end_date}</TableCell>
                        <TableCell className="font-medium">{request.days_count} days</TableCell>
                        <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{request.reviewed_by || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {(user.role === 'admin' || user.role === 'coordinator') && (
          <TabsContent value="all-requests">
            <Card className="border-slate-100 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-manrope font-semibold">All Leave Requests</h2>
                </div>
              </CardHeader>
              <CardContent>
                {allRequests.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No leave requests submitted yet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff Member</TableHead>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allRequests.map((request) => (
                        <TableRow key={request.id} className="table-row">
                          <TableCell className="font-medium">{request.staff_name}</TableCell>
                          <TableCell>{getLeaveTypeBadge(request.leave_type)}</TableCell>
                          <TableCell>{request.start_date}</TableCell>
                          <TableCell>{request.end_date}</TableCell>
                          <TableCell className="font-medium">{request.days_count} days</TableCell>
                          <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell className="text-right">
                            {request.status === 'pending' && (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleApprove(request.id)}
                                  className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReject(request.id)}
                                  className="border-rose-200 text-rose-600 hover:bg-rose-50"
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Leave;
