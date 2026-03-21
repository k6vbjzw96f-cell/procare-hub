import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Pill, Clock, AlertCircle, CheckCircle2, User } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const Medication = () => {
  const [medications, setMedications] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    medication_name: '',
    dosage: '',
    frequency: '',
    start_date: '',
    end_date: '',
    prescribing_doctor: '',
    notes: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchMedications(selectedClient);
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients`, getAuthHeader());
      setClients(response.data);
      if (response.data.length > 0) {
        setSelectedClient(response.data[0].id);
      }
    } catch (error) {
      toast.error('Failed to load clients');
    }
    setLoading(false);
  };

  const fetchMedications = async (clientId) => {
    try {
      const response = await axios.get(`${API}/medications/client/${clientId}`, getAuthHeader());
      setMedications(response.data);
    } catch (error) {
      toast.error('Failed to load medications');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/medications`, formData, getAuthHeader());
      toast.success('Medication added successfully');
      fetchMedications(selectedClient);
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add medication');
    }
  };

  const handleLogAdministration = async () => {
    try {
      await axios.post(`${API}/medications/${selectedMedication.id}/log`, {}, getAuthHeader());
      toast.success('Medication administration logged');
      setIsLogDialogOpen(false);
      setSelectedMedication(null);
    } catch (error) {
      toast.error('Failed to log administration');
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: selectedClient,
      medication_name: '',
      dosage: '',
      frequency: '',
      start_date: '',
      end_date: '',
      prescribing_doctor: '',
      notes: '',
    });
  };

  const getFrequencyLabel = (freq) => {
    const labels = {
      'daily': 'Once Daily',
      'twice_daily': 'Twice Daily',
      'three_times': '3 Times Daily',
      'weekly': 'Weekly',
      'as_needed': 'As Needed',
    };
    return labels[freq] || freq;
  };

  return (
    <div className="space-y-6" data-testid="medication-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Medication Management</h1>
          <p className="text-slate-600">Track and manage participant medications</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-medication-button">
              <Plus className="w-4 h-4 mr-2" />
              Add Medication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Add New Medication</DialogTitle>
              <DialogDescription>Add a medication for a participant</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="client_id">Participant *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select participant" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.first_name} {client.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medication_name">Medication Name *</Label>
                  <Input
                    id="medication_name"
                    value={formData.medication_name}
                    onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
                    placeholder="e.g., Paracetamol"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dosage">Dosage *</Label>
                  <Input
                    id="dosage"
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    placeholder="e.g., 500mg"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency *</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Once Daily</SelectItem>
                      <SelectItem value="twice_daily">Twice Daily</SelectItem>
                      <SelectItem value="three_times">3 Times Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="as_needed">As Needed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prescribing_doctor">Prescribing Doctor</Label>
                  <Input
                    id="prescribing_doctor"
                    value={formData.prescribing_doctor}
                    onChange={(e) => setFormData({ ...formData, prescribing_doctor: e.target.value })}
                    placeholder="Dr. Smith"
                  />
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
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes or instructions..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">Add Medication</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Client Selector */}
      <Card className="border-slate-100 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <User className="w-5 h-5 text-primary" />
            <Label className="text-sm font-medium">Select Participant:</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select participant" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.first_name} {client.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Medications List */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-manrope font-semibold">Active Medications</h2>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading medications...</div>
          ) : medications.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Pill className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium">No medications found</p>
              <p className="text-sm">Add a medication for this participant to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medication</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Prescribing Doctor</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medications.map((med) => (
                  <TableRow key={med.id} className="table-row">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
                          <Pill className="w-4 h-4 text-teal-600" />
                        </div>
                        {med.medication_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{med.dosage}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-600">
                        <Clock className="w-4 h-4" />
                        {getFrequencyLabel(med.frequency)}
                      </div>
                    </TableCell>
                    <TableCell>{med.prescribing_doctor || '-'}</TableCell>
                    <TableCell>{med.start_date}</TableCell>
                    <TableCell>{med.end_date || 'Ongoing'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedMedication(med);
                          setIsLogDialogOpen(true);
                        }}
                        data-testid={`log-med-${med.id}`}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Log Given
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Log Administration Dialog */}
      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Log Medication Administration</DialogTitle>
            <DialogDescription>
              Confirm that {selectedMedication?.medication_name} ({selectedMedication?.dosage}) has been administered.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Important:</p>
                <p>This will record the current time as the administration time. Please ensure the medication was actually given before confirming.</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsLogDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleLogAdministration}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirm Administration
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Medication;
