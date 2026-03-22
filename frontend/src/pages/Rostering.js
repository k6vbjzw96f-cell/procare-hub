import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Calendar as CalendarIcon, Pencil, Trash2, Download, FileSpreadsheet, FileText } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

// Service type color mapping
const SERVICE_COLORS = {
  'Personal Care': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  'Community Access': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Skill Development': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  'Transport': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  'Domestic Assistance': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
  'Social Support': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
  'SIL Support': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  'Respite': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
};

const Rostering = () => {
  const [shifts, setShifts] = useState([]);
  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [brandColors, setBrandColors] = useState({
    primary_color: '#10b981',
    secondary_color: '#14b8a6',
    accent_color: '#f59e0b',
    roster_color_scheme: 'default',
  });
  const [formData, setFormData] = useState({
    client_id: '',
    staff_id: '',
    shift_date: '',
    start_time: '',
    end_time: '',
    duration_hours: 0,
    service_type: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
    fetchBrandSettings();
  }, []);

  const fetchData = async () => {
    try {
      const [shiftsRes, clientsRes, staffRes] = await Promise.all([
        axios.get(`${API}/shifts`, getAuthHeader()),
        axios.get(`${API}/clients`, getAuthHeader()),
        axios.get(`${API}/staff`, getAuthHeader()),
      ]);
      setShifts(shiftsRes.data);
      setClients(clientsRes.data);
      setStaff(staffRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    }
    setLoading(false);
  };

  const fetchBrandSettings = async () => {
    try {
      const response = await axios.get(`${API}/company-settings`, getAuthHeader());
      if (response.data?.brand_settings) {
        setBrandColors(response.data.brand_settings);
      }
    } catch (error) {
      // Use defaults
    }
  };

  const getShiftColor = (shift) => {
    const scheme = brandColors.roster_color_scheme || 'default';
    
    if (scheme === 'brand') {
      return {
        backgroundColor: brandColors.primary_color + '20',
        borderColor: brandColors.primary_color,
        color: brandColors.primary_color,
      };
    }
    
    if (scheme === 'status') {
      const statusColors = {
        scheduled: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-l-blue-500' },
        confirmed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-l-emerald-500' },
        completed: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-l-slate-500' },
        cancelled: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-l-rose-500' },
        pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-l-amber-500' },
      };
      return statusColors[shift.status] || statusColors.scheduled;
    }
    
    // Default: service type colors
    return SERVICE_COLORS[shift.service_type] || { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/shifts`, formData, getAuthHeader());
      toast.success('Shift scheduled successfully');
      fetchData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this shift?')) return;
    try {
      await axios.delete(`${API}/shifts/${id}`, getAuthHeader());
      toast.success('Shift deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete shift');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await axios.put(`${API}/shifts/${id}`, { status }, getAuthHeader());
      toast.success('Shift status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      staff_id: '',
      shift_date: '',
      start_time: '',
      end_time: '',
      duration_hours: 0,
      service_type: '',
      notes: '',
    });
  };

  // Export to Excel (CSV format)
  const exportToExcel = () => {
    if (shifts.length === 0) {
      toast.error('No shifts to export');
      return;
    }

    // CSV headers
    const headers = ['Date', 'Start Time', 'End Time', 'Client', 'Staff', 'Service Type', 'Duration (hrs)', 'Status', 'Notes'];
    
    // CSV rows
    const rows = shifts.map(shift => [
      shift.shift_date,
      shift.start_time,
      shift.end_time,
      shift.client_name,
      shift.staff_name,
      shift.service_type,
      shift.duration_hours,
      shift.status,
      shift.notes || ''
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `roster_schedule_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Roster exported to Excel (CSV)');
  };

  // Export to PDF
  const exportToPDF = () => {
    if (shifts.length === 0) {
      toast.error('No shifts to export');
      return;
    }

    // Create a printable HTML document
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Roster Schedule - ProCare Hub</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #184536; padding-bottom: 20px; }
          .header h1 { color: #184536; margin: 0 0 5px 0; font-size: 28px; }
          .header p { color: #64748b; margin: 0; font-size: 14px; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #184536; color: white; padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; }
          td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .status { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 500; }
          .status-scheduled { background-color: #dbeafe; color: #1d4ed8; }
          .status-completed { background-color: #dcfce7; color: #15803d; }
          .status-cancelled { background-color: #fee2e2; color: #dc2626; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          .summary { margin-top: 30px; padding: 15px; background-color: #f1f5f9; border-radius: 8px; }
          .summary h3 { margin: 0 0 10px 0; font-size: 14px; color: #184536; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
          .summary-item { text-align: center; }
          .summary-value { font-size: 20px; font-weight: bold; color: #184536; }
          .summary-label { font-size: 11px; color: #64748b; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Roster Schedule</h1>
          <p>ProCare Hub - NDIS Provider Management</p>
        </div>
        
        <div class="meta">
          <span>Generated: ${new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span>Total Shifts: ${shifts.length}</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Client</th>
              <th>Staff</th>
              <th>Service</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${shifts.map(shift => `
              <tr>
                <td>${shift.shift_date}</td>
                <td>${shift.start_time} - ${shift.end_time}</td>
                <td>${shift.client_name}</td>
                <td>${shift.staff_name}</td>
                <td>${shift.service_type}</td>
                <td>${shift.duration_hours}h</td>
                <td><span class="status status-${shift.status}">${shift.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <h3>Summary</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-value">${shifts.length}</div>
              <div class="summary-label">Total Shifts</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${shifts.reduce((acc, s) => acc + (s.duration_hours || 0), 0).toFixed(1)}h</div>
              <div class="summary-label">Total Hours</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${shifts.filter(s => s.status === 'completed').length}</div>
              <div class="summary-label">Completed</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${shifts.filter(s => s.status === 'scheduled').length}</div>
              <div class="summary-label">Scheduled</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>ProCare Hub - Professional Care Management Platform</p>
          <p>This document was automatically generated. For questions, contact your administrator.</p>
        </div>
      </body>
      </html>
    `;

    // Open print dialog
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      // Don't close immediately to allow user to save as PDF
    }, 500);

    toast.success('PDF ready - Use "Save as PDF" in print dialog');
  };

  const getStatusBadge = (status) => {
    const styles = {
      scheduled: 'bg-blue-50 text-blue-700 border-blue-100',
      completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      cancelled: 'bg-rose-50 text-rose-700 border-rose-100',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.scheduled}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6" data-testid="rostering-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Rostering</h1>
          <p className="text-slate-600">Schedule and manage staff shifts</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="export-roster-button">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer">
                <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
                Export to Excel (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer">
                <FileText className="w-4 h-4 mr-2 text-red-600" />
                Export to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="schedule-shift-button">
                <Plus className="w-4 h-4 mr-2" />
                Schedule Shift
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Schedule New Shift</DialogTitle>
              <DialogDescription>Assign staff to client shifts</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_id">Client *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                    required
                  >
                    <SelectTrigger data-testid="shift-client-select">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff_id">Staff *</Label>
                  <Select
                    value={formData.staff_id}
                    onValueChange={(value) => setFormData({ ...formData, staff_id: value })}
                    required
                  >
                    <SelectTrigger data-testid="shift-staff-select">
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shift_date">Date *</Label>
                  <Input
                    id="shift_date"
                    type="date"
                    data-testid="shift-date-input"
                    value={formData.shift_date}
                    onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service_type">Service Type *</Label>
                  <Input
                    id="service_type"
                    data-testid="shift-service-input"
                    value={formData.service_type}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                    placeholder="e.g., Personal Care, Community Access"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="time"
                    data-testid="shift-start-input"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time *</Label>
                  <Input
                    id="end_time"
                    type="time"
                    data-testid="shift-end-input"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration_hours">Duration (hours) *</Label>
                  <Input
                    id="duration_hours"
                    type="number"
                    step="0.5"
                    data-testid="shift-duration-input"
                    value={formData.duration_hours}
                    onChange={(e) => setFormData({ ...formData, duration_hours: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    data-testid="shift-notes-input"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="shift-submit-button">
                  Schedule Shift
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-manrope font-semibold">Scheduled Shifts</h2>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading shifts...</div>
          ) : shifts.length === 0 ? (
            <div className="text-center py-8 text-slate-500" data-testid="no-shifts-message">
              No shifts scheduled. Create your first shift to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift) => (
                  <TableRow key={shift.id} className="table-row" data-testid={`shift-row-${shift.id}`}>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{shift.shift_date}</div>
                        <div className="text-slate-500">{shift.start_time} - {shift.end_time}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{shift.client_name}</TableCell>
                    <TableCell>{shift.staff_name}</TableCell>
                    <TableCell>{shift.service_type}</TableCell>
                    <TableCell>{shift.duration_hours}h</TableCell>
                    <TableCell>
                      <Select value={shift.status} onValueChange={(value) => handleStatusChange(shift.id, value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue>{getStatusBadge(shift.status)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`delete-shift-${shift.id}`}
                        onClick={() => handleDelete(shift.id)}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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

export default Rostering;