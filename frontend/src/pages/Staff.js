import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Pencil, Trash2, Upload, Clock, LogOut as LogOutIcon } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    position: '',
    hourly_rate: 0,
    certifications: [],
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await axios.get(`${API}/staff`, getAuthHeader());
      setStaff(response.data);
      
      // Fetch attendance status for each staff member
      const statusPromises = response.data.map(async (member) => {
        try {
          const statusRes = await axios.get(`${API}/staff/${member.id}/attendance-status`, getAuthHeader());
          return { id: member.id, status: statusRes.data };
        } catch {
          return { id: member.id, status: { is_clocked_in: false } };
        }
      });
      
      const statuses = await Promise.all(statusPromises);
      const statusMap = {};
      statuses.forEach(s => { statusMap[s.id] = s.status; });
      setAttendanceStatus(statusMap);
    } catch (error) {
      toast.error('Failed to load staff');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        await axios.put(`${API}/staff/${editingStaff.id}`, formData, getAuthHeader());
        toast.success('Staff updated successfully');
      } else {
        await axios.post(`${API}/staff`, formData, getAuthHeader());
        toast.success('Staff added successfully');
      }
      fetchStaff();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    try {
      await axios.delete(`${API}/staff/${id}`, getAuthHeader());
      toast.success('Staff deleted successfully');
      fetchStaff();
    } catch (error) {
      toast.error('Failed to delete staff');
    }
  };

  const handlePhotoUpload = async (staffId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await axios.post(`${API}/staff/${staffId}/photo`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast.success('Photo uploaded successfully');
      fetchStaff();
    } catch (error) {
      toast.error('Failed to upload photo');
    }
  };

  const handleClockIn = async (staffId) => {
    try {
      await axios.post(`${API}/staff/${staffId}/clock-in`, {}, getAuthHeader());
      toast.success('Clocked in successfully');
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to clock in');
    }
  };

  const handleClockOut = async (staffId) => {
    try {
      const response = await axios.post(`${API}/staff/${staffId}/clock-out`, {}, getAuthHeader());
      toast.success(`Clocked out successfully. Total hours: ${response.data.total_hours}`);
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to clock out');
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      position: '',
      hourly_rate: 0,
      certifications: [],
    });
    setEditingStaff(null);
  };

  const openEditDialog = (staffMember) => {
    setEditingStaff(staffMember);
    setFormData({
      full_name: staffMember.full_name,
      email: staffMember.email,
      phone: staffMember.phone || '',
      position: staffMember.position,
      hourly_rate: staffMember.hourly_rate,
      certifications: staffMember.certifications || [],
    });
    setIsDialogOpen(true);
  };

  const filteredStaff = staff.filter((member) =>
    member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      inactive: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.active}`}>
        {status}
      </span>
    );
  };

  const getScreeningBadge = (screening) => {
    const styles = {
      approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      pending: 'bg-amber-50 text-amber-700 border-amber-100',
      expired: 'bg-rose-50 text-rose-700 border-rose-100',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[screening] || styles.pending}`}>
        {screening}
      </span>
    );
  };

  return (
    <div className="space-y-6" data-testid="staff-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Staff</h1>
          <p className="text-slate-600">Manage your care team and their certifications</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-staff-button">
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingStaff ? 'Edit Staff' : 'Add New Staff'}</DialogTitle>
              <DialogDescription>Enter staff member details and qualifications</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    data-testid="staff-name-input"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    data-testid="staff-email-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    data-testid="staff-phone-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position *</Label>
                  <Input
                    id="position"
                    data-testid="staff-position-input"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="e.g., Support Worker, Care Coordinator"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    step="0.01"
                    data-testid="staff-rate-input"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="staff-submit-button">
                  {editingStaff ? 'Update Staff' : 'Add Staff'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search staff..."
                data-testid="staff-search-input"
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading staff...</div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-8 text-slate-500" data-testid="no-staff-message">
              No staff members found. Add your first staff member to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Screening</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((member) => (
                  <TableRow key={member.id} className="table-row" data-testid={`staff-row-${member.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.photo_url ? `${API}${member.photo_url}?auth=${localStorage.getItem('token')}` : undefined} />
                          <AvatarFallback className="bg-primary-100 text-primary-700">
                            {member.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.full_name}</div>
                          <label className="text-xs text-primary cursor-pointer hover:underline">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => e.target.files[0] && handlePhotoUpload(member.id, e.target.files[0])}
                            />
                            <Upload className="w-3 h-3 inline mr-1" />
                            Upload Photo
                          </label>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{member.position}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{member.email}</div>
                        <div className="text-slate-500">{member.phone || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>${member.hourly_rate}/hr</TableCell>
                    <TableCell>{getScreeningBadge(member.screening_status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(member.status)}
                        {attendanceStatus[member.id]?.is_clocked_in && (
                          <Badge variant="default" className="bg-emerald-500">
                            <Clock className="w-3 h-3 mr-1" />
                            On Duty
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {attendanceStatus[member.id]?.is_clocked_in ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleClockOut(member.id)}
                            data-testid={`clock-out-${member.id}`}
                            className="border-rose-200 text-rose-600 hover:bg-rose-50"
                          >
                            <LogOutIcon className="w-4 h-4 mr-1" />
                            Clock Out
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleClockIn(member.id)}
                            data-testid={`clock-in-${member.id}`}
                            className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          >
                            <Clock className="w-4 h-4 mr-1" />
                            Clock In
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`edit-staff-${member.id}`}
                          onClick={() => openEditDialog(member)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`delete-staff-${member.id}`}
                          onClick={() => handleDelete(member.id)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Staff;