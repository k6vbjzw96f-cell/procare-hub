import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Calendar, Clock, MapPin, User, Users, CheckCircle, XCircle, 
  Search, Eye, CalendarCheck, AlertCircle, Loader2
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const SERVICE_TYPES = [
  'Personal Care',
  'Community Access',
  'Skill Development',
  'Transport',
  'Domestic Assistance',
  'Social Support',
  'SIL Support',
  'Respite',
  'Therapy',
  'Group Activities'
];

const FREQUENCY_OPTIONS = [
  { value: 'one-time', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
];

const ServiceBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    client_id: '',
    service_type: '',
    preferred_date: '',
    preferred_time: '',
    duration_hours: 2,
    frequency: 'one-time',
    location: '',
    special_requirements: '',
    notes: '',
  });

  const [scheduleData, setScheduleData] = useState({
    scheduled_date: '',
    scheduled_time: '',
    staff_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bookingsRes, clientsRes, staffRes, statsRes] = await Promise.all([
        axios.get(`${API}/service-bookings`, getAuthHeader()),
        axios.get(`${API}/clients`, getAuthHeader()),
        axios.get(`${API}/staff`, getAuthHeader()),
        axios.get(`${API}/service-bookings/stats/summary`, getAuthHeader()),
      ]);
      setBookings(bookingsRes.data);
      setClients(clientsRes.data);
      setStaff(staffRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/service-bookings`, formData, getAuthHeader());
      toast.success('Service booking request submitted');
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit request');
    }
    setSubmitting(false);
  };

  const handleApprove = async (bookingId) => {
    try {
      await axios.put(`${API}/service-bookings/${bookingId}/approve`, {}, getAuthHeader());
      toast.success('Booking approved');
      fetchData();
      setShowViewModal(false);
    } catch (error) {
      toast.error('Failed to approve booking');
    }
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;
    try {
      await axios.put(
        `${API}/service-bookings/${selectedBooking.id}/schedule?scheduled_date=${scheduleData.scheduled_date}&scheduled_time=${scheduleData.scheduled_time}&staff_id=${scheduleData.staff_id}`,
        {},
        getAuthHeader()
      );
      toast.success('Service scheduled successfully');
      setShowScheduleModal(false);
      setShowViewModal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to schedule service');
    }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await axios.put(`${API}/service-bookings/${bookingId}/cancel`, {}, getAuthHeader());
      toast.success('Booking cancelled');
      fetchData();
    } catch (error) {
      toast.error('Failed to cancel booking');
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      service_type: '',
      preferred_date: '',
      preferred_time: '',
      duration_hours: 2,
      frequency: 'one-time',
      location: '',
      special_requirements: '',
      notes: '',
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      requested: 'bg-amber-100 text-amber-700',
      approved: 'bg-blue-100 text-blue-700',
      scheduled: 'bg-emerald-100 text-emerald-700',
      completed: 'bg-slate-100 text-slate-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return <Badge className={styles[status] || styles.requested}>{status}</Badge>;
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.service_type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || booking.status === activeTab;
    return matchesSearch && matchesTab;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="service-bookings-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Service Bookings</h1>
          <p className="text-slate-500 mt-1">Request and manage support services</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Request Service
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-500">Total Requests</p>
            </CardContent>
          </Card>
          <Card className="border-amber-100 bg-amber-50/50">
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-amber-700">{stats.requested}</p>
              <p className="text-xs text-slate-500">Pending Review</p>
            </CardContent>
          </Card>
          <Card className="border-blue-100 bg-blue-50/50">
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-blue-700">{stats.approved}</p>
              <p className="text-xs text-slate-500">Approved</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-100 bg-emerald-50/50">
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-emerald-700">{stats.scheduled}</p>
              <p className="text-xs text-slate-500">Scheduled</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-slate-600">{stats.completed}</p>
              <p className="text-xs text-slate-500">Completed</p>
            </CardContent>
          </Card>
          <Card className="border-red-100 bg-red-50/50">
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-red-700">{stats.cancelled}</p>
              <p className="text-xs text-slate-500">Cancelled</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="requested">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-[250px]"
          />
        </div>
      </div>

      {/* Bookings Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Preferred Date</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Staff</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    No service bookings found
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((booking) => (
                  <TableRow key={booking.id} className="cursor-pointer hover:bg-slate-50" onClick={() => { setSelectedBooking(booking); setShowViewModal(true); }}>
                    <TableCell className="font-medium">{booking.client_name}</TableCell>
                    <TableCell>{booking.service_type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {booking.preferred_date}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{booking.frequency}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell className="text-slate-600">
                      {booking.assigned_staff_name || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); setShowViewModal(true); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Booking Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-primary" />
              Request a Service
            </DialogTitle>
            <DialogDescription>
              Submit a request for support services
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Participant *</Label>
              <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select participant" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Service Type *</Label>
              <Select value={formData.service_type} onValueChange={(v) => setFormData({ ...formData, service_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preferred Date *</Label>
                <Input type="date" value={formData.preferred_date} onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Preferred Time</Label>
                <Input type="time" value={formData.preferred_time} onChange={(e) => setFormData({ ...formData, preferred_time: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (hours)</Label>
                <Input type="number" step="0.5" min="0.5" value={formData.duration_hours} onChange={(e) => setFormData({ ...formData, duration_hours: parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Service location (if applicable)" />
            </div>

            <div className="space-y-2">
              <Label>Special Requirements</Label>
              <Textarea value={formData.special_requirements} onChange={(e) => setFormData({ ...formData, special_requirements: e.target.value })} placeholder="Any special requirements or preferences" rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Any other information" rows={2} />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Submit Request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Booking Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-lg">
          {selectedBooking && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>{selectedBooking.service_type}</DialogTitle>
                  {getStatusBadge(selectedBooking.status)}
                </div>
                <DialogDescription>
                  Requested by {selectedBooking.requested_by_name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-sm"><strong>Participant:</strong> {selectedBooking.client_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-sm"><strong>Preferred:</strong> {selectedBooking.preferred_date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-sm"><strong>Duration:</strong> {selectedBooking.duration_hours}h</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm"><strong>Frequency:</strong> {selectedBooking.frequency}</span>
                  </div>
                </div>

                {selectedBooking.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                    <span className="text-sm">{selectedBooking.location}</span>
                  </div>
                )}

                {selectedBooking.special_requirements && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Special Requirements</h4>
                    <p className="text-sm text-slate-600">{selectedBooking.special_requirements}</p>
                  </div>
                )}

                {selectedBooking.notes && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Notes</h4>
                    <p className="text-sm text-slate-600">{selectedBooking.notes}</p>
                  </div>
                )}

                {selectedBooking.assigned_staff_name && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm text-emerald-700">
                        <strong>Assigned:</strong> {selectedBooking.assigned_staff_name}
                      </span>
                    </div>
                    {selectedBooking.scheduled_date && (
                      <p className="text-sm text-emerald-600 mt-1">
                        Scheduled: {selectedBooking.scheduled_date} at {selectedBooking.scheduled_time}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions based on status */}
                <div className="flex justify-between pt-4 border-t">
                  <div className="flex gap-2">
                    {selectedBooking.status === 'requested' && (
                      <>
                        <Button variant="outline" className="text-emerald-600 border-emerald-200" onClick={() => handleApprove(selectedBooking.id)}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button variant="outline" className="text-red-600 border-red-200" onClick={() => handleCancel(selectedBooking.id)}>
                          <XCircle className="w-4 h-4 mr-2" />
                          Decline
                        </Button>
                      </>
                    )}
                    {selectedBooking.status === 'approved' && (
                      <Button onClick={() => { setScheduleData({ scheduled_date: selectedBooking.preferred_date, scheduled_time: selectedBooking.preferred_time || '09:00', staff_id: '' }); setShowScheduleModal(true); }}>
                        <CalendarCheck className="w-4 h-4 mr-2" />
                        Schedule
                      </Button>
                    )}
                  </div>
                  <Button variant="ghost" onClick={() => setShowViewModal(false)}>Close</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Service</DialogTitle>
            <DialogDescription>Assign a staff member and confirm the schedule</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSchedule} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={scheduleData.scheduled_date} onChange={(e) => setScheduleData({ ...scheduleData, scheduled_date: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Time *</Label>
              <Input type="time" value={scheduleData.scheduled_time} onChange={(e) => setScheduleData({ ...scheduleData, scheduled_time: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Assign Staff *</Label>
              <Select value={scheduleData.staff_id} onValueChange={(v) => setScheduleData({ ...scheduleData, staff_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                <SelectContent>
                  {staff.filter(s => s.status === 'active').map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowScheduleModal(false)}>Cancel</Button>
              <Button type="submit">Confirm Schedule</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceBookings;
