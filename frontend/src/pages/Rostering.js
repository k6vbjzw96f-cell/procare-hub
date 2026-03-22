import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, Calendar as CalendarIcon, Pencil, Trash2, Download, FileSpreadsheet, FileText, 
  Repeat, Wand2, Copy, CalendarDays, Users, Sparkles, Check, Clock, AlertCircle
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('shifts');
  
  // Automation modals
  const [showBulkSchedule, setShowBulkSchedule] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAutoAssign, setShowAutoAssign] = useState(false);
  const [autoAssignSuggestions, setAutoAssignSuggestions] = useState(null);
  
  // Templates & Recurring
  const [templates, setTemplates] = useState([]);
  const [recurringShifts, setRecurringShifts] = useState([]);
  
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

  // Bulk Schedule Form
  const [bulkForm, setBulkForm] = useState({
    client_id: '',
    staff_id: '',
    service_type: '',
    start_time: '09:00',
    end_time: '17:00',
    duration_hours: 8,
    start_date: '',
    end_date: '',
    days_of_week: [],
    notes: '',
  });

  // Recurring Shift Form
  const [recurringForm, setRecurringForm] = useState({
    client_id: '',
    staff_id: '',
    service_type: '',
    start_time: '09:00',
    end_time: '17:00',
    duration_hours: 8,
    recurrence_type: 'weekly',
    days_of_week: [],
    start_date: '',
    end_date: '',
    notes: '',
  });

  // Template Form
  const [templateForm, setTemplateForm] = useState({
    name: '',
    service_type: '',
    start_time: '09:00',
    end_time: '17:00',
    duration_hours: 8,
    notes: '',
  });

  // Auto-Assign Form
  const [autoAssignForm, setAutoAssignForm] = useState({
    client_id: '',
    shift_date: '',
    start_time: '09:00',
    end_time: '17:00',
    duration_hours: 8,
    service_type: '',
    notes: '',
  });

  const DAYS_OF_WEEK = [
    { value: 0, label: 'Mon' },
    { value: 1, label: 'Tue' },
    { value: 2, label: 'Wed' },
    { value: 3, label: 'Thu' },
    { value: 4, label: 'Fri' },
    { value: 5, label: 'Sat' },
    { value: 6, label: 'Sun' },
  ];

  useEffect(() => {
    fetchData();
    fetchBrandSettings();
    fetchTemplates();
    fetchRecurringShifts();
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

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API}/shift-templates`, getAuthHeader());
      setTemplates(response.data);
    } catch (error) {
      // Ignore
    }
  };

  const fetchRecurringShifts = async () => {
    try {
      const response = await axios.get(`${API}/recurring-shifts`, getAuthHeader());
      setRecurringShifts(response.data);
    } catch (error) {
      // Ignore
    }
  };

  // Bulk Schedule Handler
  const handleBulkSchedule = async (e) => {
    e.preventDefault();
    if (bulkForm.days_of_week.length === 0) {
      toast.error('Please select at least one day');
      return;
    }
    try {
      const response = await axios.post(`${API}/shifts/bulk-schedule`, bulkForm, getAuthHeader());
      toast.success(response.data.message);
      setShowBulkSchedule(false);
      fetchData();
      setBulkForm({
        client_id: '', staff_id: '', service_type: '', start_time: '09:00', end_time: '17:00',
        duration_hours: 8, start_date: '', end_date: '', days_of_week: [], notes: '',
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create bulk schedule');
    }
  };

  // Recurring Shift Handler
  const handleCreateRecurring = async (e) => {
    e.preventDefault();
    if (recurringForm.recurrence_type === 'weekly' && recurringForm.days_of_week.length === 0) {
      toast.error('Please select at least one day for weekly recurrence');
      return;
    }
    try {
      await axios.post(`${API}/recurring-shifts`, recurringForm, getAuthHeader());
      toast.success('Recurring shift created');
      setShowRecurring(false);
      fetchRecurringShifts();
      setRecurringForm({
        client_id: '', staff_id: '', service_type: '', start_time: '09:00', end_time: '17:00',
        duration_hours: 8, recurrence_type: 'weekly', days_of_week: [], start_date: '', end_date: '', notes: '',
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create recurring shift');
    }
  };

  // Generate shifts from recurring
  const handleGenerateFromRecurring = async (recurringId) => {
    try {
      const response = await axios.post(`${API}/recurring-shifts/${recurringId}/generate?weeks=4`, {}, getAuthHeader());
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error('Failed to generate shifts');
    }
  };

  // Template Handlers
  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/shift-templates`, templateForm, getAuthHeader());
      toast.success('Template saved');
      fetchTemplates();
      setTemplateForm({ name: '', service_type: '', start_time: '09:00', end_time: '17:00', duration_hours: 8, notes: '' });
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      await axios.delete(`${API}/shift-templates/${templateId}`, getAuthHeader());
      toast.success('Template deleted');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const applyTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      service_type: template.service_type,
      start_time: template.start_time,
      end_time: template.end_time,
      duration_hours: template.duration_hours,
      notes: template.notes || '',
    }));
    setShowTemplates(false);
    setIsDialogOpen(true);
    toast.success(`Template "${template.name}" applied`);
  };

  // Auto-Assign Handler
  const handleAutoAssign = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/shifts/auto-assign`, autoAssignForm, getAuthHeader());
      setAutoAssignSuggestions(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to get suggestions');
    }
  };

  const handleConfirmAutoAssign = async (staffSuggestion) => {
    try {
      const shiftData = {
        ...autoAssignForm,
        staff_id: staffSuggestion.staff_id,
      };
      await axios.post(`${API}/shifts`, shiftData, getAuthHeader());
      toast.success(`Shift assigned to ${staffSuggestion.staff_name}`);
      setShowAutoAssign(false);
      setAutoAssignSuggestions(null);
      setAutoAssignForm({
        client_id: '', shift_date: '', start_time: '09:00', end_time: '17:00',
        duration_hours: 8, service_type: '', notes: '',
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to create shift');
    }
  };

  // Toggle day selection
  const toggleDay = (dayValue, formSetter, currentDays) => {
    if (currentDays.includes(dayValue)) {
      formSetter(prev => ({ ...prev, days_of_week: prev.days_of_week.filter(d => d !== dayValue) }));
    } else {
      formSetter(prev => ({ ...prev, days_of_week: [...prev.days_of_week, dayValue] }));
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
          {/* Automation Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-gradient-to-r from-primary/5 to-emerald-50 border-primary/20 hover:border-primary/40">
                <Wand2 className="w-4 h-4 mr-2 text-primary" />
                Automate
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setShowBulkSchedule(true)} className="cursor-pointer">
                <CalendarDays className="w-4 h-4 mr-2 text-blue-600" />
                Bulk Schedule
                <span className="ml-auto text-xs text-slate-400">Week/Month</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowRecurring(true)} className="cursor-pointer">
                <Repeat className="w-4 h-4 mr-2 text-purple-600" />
                Recurring Shifts
                <span className="ml-auto text-xs text-slate-400">Auto-repeat</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowAutoAssign(true)} className="cursor-pointer">
                <Sparkles className="w-4 h-4 mr-2 text-amber-600" />
                Auto-Assign Staff
                <span className="ml-auto text-xs text-slate-400">AI Match</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowTemplates(true)} className="cursor-pointer">
                <Copy className="w-4 h-4 mr-2 text-slate-600" />
                Shift Templates
                <span className="ml-auto text-xs text-slate-400">{templates.length}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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

      {/* ==================== AUTOMATION MODALS ==================== */}

      {/* Bulk Schedule Modal */}
      <Dialog open={showBulkSchedule} onOpenChange={setShowBulkSchedule}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              Bulk Schedule Shifts
            </DialogTitle>
            <DialogDescription>Create multiple shifts at once for a date range</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBulkSchedule} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select value={bulkForm.client_id} onValueChange={(v) => setBulkForm({ ...bulkForm, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Staff *</Label>
                <Select value={bulkForm.staff_id} onValueChange={(v) => setBulkForm({ ...bulkForm, staff_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {staff.filter(s => s.status === 'active').map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Service Type *</Label>
              <Select value={bulkForm.service_type} onValueChange={(v) => setBulkForm({ ...bulkForm, service_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>
                  {Object.keys(SERVICE_COLORS).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input type="date" value={bulkForm.start_date} onChange={(e) => setBulkForm({ ...bulkForm, start_date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input type="date" value={bulkForm.end_date} onChange={(e) => setBulkForm({ ...bulkForm, end_date: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={bulkForm.start_time} onChange={(e) => setBulkForm({ ...bulkForm, start_time: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={bulkForm.end_time} onChange={(e) => setBulkForm({ ...bulkForm, end_time: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Hours</Label>
                <Input type="number" step="0.5" value={bulkForm.duration_hours} onChange={(e) => setBulkForm({ ...bulkForm, duration_hours: parseFloat(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Days of Week *</Label>
              <div className="flex gap-2 flex-wrap">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    size="sm"
                    variant={bulkForm.days_of_week.includes(day.value) ? 'default' : 'outline'}
                    onClick={() => toggleDay(day.value, setBulkForm, bulkForm.days_of_week)}
                    className="w-12"
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowBulkSchedule(false)}>Cancel</Button>
              <Button type="submit">Create Shifts</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Recurring Shifts Modal */}
      <Dialog open={showRecurring} onOpenChange={setShowRecurring}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="w-5 h-5 text-purple-600" />
              Recurring Shifts
            </DialogTitle>
            <DialogDescription>Set up shifts that automatically repeat</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="create">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create New</TabsTrigger>
              <TabsTrigger value="manage">Manage ({recurringShifts.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="space-y-4 mt-4">
              <form onSubmit={handleCreateRecurring} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Client *</Label>
                    <Select value={recurringForm.client_id} onValueChange={(v) => setRecurringForm({ ...recurringForm, client_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Staff *</Label>
                    <Select value={recurringForm.staff_id} onValueChange={(v) => setRecurringForm({ ...recurringForm, staff_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                      <SelectContent>
                        {staff.filter(s => s.status === 'active').map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Service Type *</Label>
                    <Select value={recurringForm.service_type} onValueChange={(v) => setRecurringForm({ ...recurringForm, service_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(SERVICE_COLORS).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Recurrence *</Label>
                    <Select value={recurringForm.recurrence_type} onValueChange={(v) => setRecurringForm({ ...recurringForm, recurrence_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="fortnightly">Fortnightly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {(recurringForm.recurrence_type === 'weekly' || recurringForm.recurrence_type === 'fortnightly') && (
                  <div className="space-y-2">
                    <Label>Days of Week *</Label>
                    <div className="flex gap-2 flex-wrap">
                      {DAYS_OF_WEEK.map((day) => (
                        <Button
                          key={day.value}
                          type="button"
                          size="sm"
                          variant={recurringForm.days_of_week.includes(day.value) ? 'default' : 'outline'}
                          onClick={() => toggleDay(day.value, setRecurringForm, recurringForm.days_of_week)}
                          className="w-12"
                        >
                          {day.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Input type="date" value={recurringForm.start_date} onChange={(e) => setRecurringForm({ ...recurringForm, start_date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date (Optional)</Label>
                    <Input type="date" value={recurringForm.end_date} onChange={(e) => setRecurringForm({ ...recurringForm, end_date: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input type="time" value={recurringForm.start_time} onChange={(e) => setRecurringForm({ ...recurringForm, start_time: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input type="time" value={recurringForm.end_time} onChange={(e) => setRecurringForm({ ...recurringForm, end_time: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hours</Label>
                    <Input type="number" step="0.5" value={recurringForm.duration_hours} onChange={(e) => setRecurringForm({ ...recurringForm, duration_hours: parseFloat(e.target.value) })} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setShowRecurring(false)}>Cancel</Button>
                  <Button type="submit">Create Recurring</Button>
                </div>
              </form>
            </TabsContent>
            <TabsContent value="manage" className="mt-4">
              {recurringShifts.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No recurring shifts set up</div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {recurringShifts.map((r) => (
                    <div key={r.id} className="p-4 border rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-medium">{r.client_name} → {r.staff_name}</p>
                        <p className="text-sm text-slate-500">{r.service_type} | {r.start_time}-{r.end_time} | {r.recurrence_type}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleGenerateFromRecurring(r.id)}>
                          Generate 4 weeks
                        </Button>
                        <Button size="sm" variant="ghost" onClick={async () => {
                          await axios.delete(`${API}/recurring-shifts/${r.id}`, getAuthHeader());
                          fetchRecurringShifts();
                          toast.success('Recurring shift deleted');
                        }}>
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Shift Templates Modal */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-slate-600" />
              Shift Templates
            </DialogTitle>
            <DialogDescription>Save and reuse common shift configurations</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="use">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="use">Use Template</TabsTrigger>
              <TabsTrigger value="create">Create New</TabsTrigger>
            </TabsList>
            <TabsContent value="use" className="mt-4">
              {templates.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No templates saved yet</div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {templates.map((t) => (
                    <div key={t.id} className="p-3 border rounded-lg flex items-center justify-between hover:bg-slate-50 cursor-pointer" onClick={() => applyTemplate(t)}>
                      <div>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-sm text-slate-500">{t.service_type} | {t.start_time}-{t.end_time} ({t.duration_hours}h)</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id); }}>
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="create" className="mt-4">
              <form onSubmit={handleSaveTemplate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Template Name *</Label>
                  <Input value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="e.g., Morning SIL Shift" required />
                </div>
                <div className="space-y-2">
                  <Label>Service Type *</Label>
                  <Select value={templateForm.service_type} onValueChange={(v) => setTemplateForm({ ...templateForm, service_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(SERVICE_COLORS).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input type="time" value={templateForm.start_time} onChange={(e) => setTemplateForm({ ...templateForm, start_time: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input type="time" value={templateForm.end_time} onChange={(e) => setTemplateForm({ ...templateForm, end_time: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hours</Label>
                    <Input type="number" step="0.5" value={templateForm.duration_hours} onChange={(e) => setTemplateForm({ ...templateForm, duration_hours: parseFloat(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={templateForm.notes} onChange={(e) => setTemplateForm({ ...templateForm, notes: e.target.value })} placeholder="Optional notes" />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setShowTemplates(false)}>Cancel</Button>
                  <Button type="submit">Save Template</Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Auto-Assign Modal */}
      <Dialog open={showAutoAssign} onOpenChange={(open) => { setShowAutoAssign(open); if (!open) setAutoAssignSuggestions(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              Auto-Assign Staff
            </DialogTitle>
            <DialogDescription>Let the system suggest the best available staff</DialogDescription>
          </DialogHeader>
          {!autoAssignSuggestions ? (
            <form onSubmit={handleAutoAssign} className="space-y-4">
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select value={autoAssignForm.client_id} onValueChange={(v) => setAutoAssignForm({ ...autoAssignForm, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Service Type *</Label>
                <Select value={autoAssignForm.service_type} onValueChange={(v) => setAutoAssignForm({ ...autoAssignForm, service_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(SERVICE_COLORS).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Shift Date *</Label>
                <Input type="date" value={autoAssignForm.shift_date} onChange={(e) => setAutoAssignForm({ ...autoAssignForm, shift_date: e.target.value })} required />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" value={autoAssignForm.start_time} onChange={(e) => setAutoAssignForm({ ...autoAssignForm, start_time: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" value={autoAssignForm.end_time} onChange={(e) => setAutoAssignForm({ ...autoAssignForm, end_time: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Hours</Label>
                  <Input type="number" step="0.5" value={autoAssignForm.duration_hours} onChange={(e) => setAutoAssignForm({ ...autoAssignForm, duration_hours: parseFloat(e.target.value) })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowAutoAssign(false)}>Cancel</Button>
                <Button type="submit">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Find Best Match
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">
                  <strong>{autoAssignSuggestions.client_name}</strong> on {autoAssignSuggestions.shift_date} ({autoAssignSuggestions.shift_time})
                </p>
                <p className="text-xs text-slate-500">{autoAssignSuggestions.service_type} | {autoAssignSuggestions.total_available} staff available</p>
              </div>
              
              {autoAssignSuggestions.suggestions.length === 0 ? (
                <div className="text-center py-6">
                  <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                  <p className="text-slate-600">No available staff found for this shift</p>
                  <p className="text-sm text-slate-400">Try a different date or time</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {autoAssignSuggestions.suggestions.map((s, idx) => (
                    <div key={s.staff_id} className={`p-4 border rounded-lg ${idx === 0 ? 'border-primary bg-primary/5' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {idx === 0 && <Badge className="bg-primary text-white">Best Match</Badge>}
                          <span className="font-medium">{s.staff_name}</span>
                        </div>
                        <span className="text-sm font-semibold text-primary">Score: {s.score}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {s.reasons.map((r, i) => (
                          <Badge key={i} variant="outline" className="text-xs font-normal">
                            <Check className="w-3 h-3 mr-1" />
                            {r}
                          </Badge>
                        ))}
                      </div>
                      <Button size="sm" className="w-full" onClick={() => handleConfirmAutoAssign(s)}>
                        Assign to {s.staff_name}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setAutoAssignSuggestions(null)}>
                  ← Back
                </Button>
                <Button variant="ghost" onClick={() => { setShowAutoAssign(false); setAutoAssignSuggestions(null); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Rostering;