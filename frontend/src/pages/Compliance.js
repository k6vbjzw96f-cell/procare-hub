import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Shield, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const Compliance = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    record_type: 'incident',
    title: '',
    description: '',
    severity: 'low',
    reported_by: '',
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      setFormData((prev) => ({ ...prev, reported_by: user.full_name }));
    }
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const response = await axios.get(`${API}/compliance`, getAuthHeader());
      setRecords(response.data);
    } catch (error) {
      toast.error('Failed to load compliance records');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/compliance`, formData, getAuthHeader());
      toast.success('Compliance record created successfully');
      fetchRecords();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await axios.put(`${API}/compliance/${id}`, { status }, getAuthHeader());
      toast.success('Record status updated');
      fetchRecords();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    setFormData({
      record_type: 'incident',
      title: '',
      description: '',
      severity: 'low',
      reported_by: user?.full_name || '',
    });
  };

  const getSeverityBadge = (severity) => {
    const styles = {
      low: 'bg-blue-50 text-blue-700 border-blue-100',
      medium: 'bg-amber-50 text-amber-700 border-amber-100',
      high: 'bg-rose-50 text-rose-700 border-rose-100',
      critical: 'bg-red-100 text-red-800 border-red-200',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[severity] || styles.low}`}>
        {severity}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-amber-50 text-amber-700 border-amber-100',
      investigating: 'bg-blue-50 text-blue-700 border-blue-100',
      resolved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.open}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6" data-testid="compliance-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Compliance</h1>
          <p className="text-slate-600">Track incidents, audits, and compliance issues</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="create-compliance-button">
              <Plus className="w-4 h-4 mr-2" />
              Report Issue
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Compliance Record</DialogTitle>
              <DialogDescription>Report incidents, audits, or compliance issues</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="record_type">Record Type *</Label>
                  <Select
                    value={formData.record_type}
                    onValueChange={(value) => setFormData({ ...formData, record_type: value })}
                    required
                  >
                    <SelectTrigger data-testid="compliance-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incident">Incident</SelectItem>
                      <SelectItem value="audit">Audit</SelectItem>
                      <SelectItem value="complaint">Complaint</SelectItem>
                      <SelectItem value="breach">Breach</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="severity">Severity *</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(value) => setFormData({ ...formData, severity: value })}
                    required
                  >
                    <SelectTrigger data-testid="compliance-severity-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    data-testid="compliance-title-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Brief description of the issue"
                    required
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    data-testid="compliance-description-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed description of the incident or issue..."
                    rows={4}
                    required
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="reported_by">Reported By *</Label>
                  <Input
                    id="reported_by"
                    data-testid="compliance-reporter-input"
                    value={formData.reported_by}
                    onChange={(e) => setFormData({ ...formData, reported_by: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="compliance-submit-button">
                  Create Record
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Open Issues</p>
                <p className="text-3xl font-bold text-amber-600">
                  {records.filter((r) => r.status === 'open').length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-100">
                <AlertTriangle className="w-6 h-6 text-amber-700" strokeWidth={1.5} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Investigating</p>
                <p className="text-3xl font-bold text-blue-600">
                  {records.filter((r) => r.status === 'investigating').length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100">
                <Shield className="w-6 h-6 text-blue-700" strokeWidth={1.5} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Resolved</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {records.filter((r) => r.status === 'resolved').length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100">
                <Shield className="w-6 h-6 text-emerald-700" strokeWidth={1.5} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-manrope font-semibold">Compliance Records</h2>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading records...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-slate-500" data-testid="no-compliance-message">
              No compliance records. All systems operating normally.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id} className="table-row" data-testid={`compliance-row-${record.id}`}>
                    <TableCell className="capitalize font-medium">{record.record_type}</TableCell>
                    <TableCell>{record.title}</TableCell>
                    <TableCell>{getSeverityBadge(record.severity)}</TableCell>
                    <TableCell>{record.reported_by}</TableCell>
                    <TableCell>
                      {new Date(record.reported_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Select value={record.status} onValueChange={(value) => handleStatusChange(record.id, value)}>
                        <SelectTrigger className="w-36">
                          <SelectValue>{getStatusBadge(record.status)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="investigating">Investigating</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" data-testid={`view-compliance-${record.id}`}>
                        View
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

export default Compliance;