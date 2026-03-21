import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Car, BookOpen, Pencil, Trash2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [clients, setClients] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    registration: '',
    vin: '',
    owner_type: 'client',
    owner_id: '',
    registration_expiry: '',
    insurance_expiry: '',
  });
  const [logFormData, setLogFormData] = useState({
    log_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    odometer_start: 0,
    odometer_end: 0,
    destination: '',
    purpose: '',
    fuel_added: 0,
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vehiclesRes, clientsRes, logsRes] = await Promise.all([
        axios.get(`${API}/vehicles`, getAuthHeader()),
        axios.get(`${API}/clients`, getAuthHeader()),
        axios.get(`${API}/vehicle-logs`, getAuthHeader()),
      ]);
      setVehicles(vehiclesRes.data);
      setClients(clientsRes.data);
      setLogs(logsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/vehicles`, formData, getAuthHeader());
      toast.success('Vehicle added successfully');
      fetchData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add vehicle');
    }
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    try {
      await axios.post(`${API}/vehicles/${selectedVehicle.id}/logs`, logFormData, getAuthHeader());
      toast.success('Log entry added successfully');
      fetchData();
      setIsLogDialogOpen(false);
      resetLogForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add log');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      await axios.delete(`${API}/vehicles/${id}`, getAuthHeader());
      toast.success('Vehicle deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete vehicle');
    }
  };

  const resetForm = () => {
    setFormData({
      make: '',
      model: '',
      year: new Date().getFullYear(),
      registration: '',
      vin: '',
      owner_type: 'client',
      owner_id: '',
      registration_expiry: '',
      insurance_expiry: '',
    });
  };

  const resetLogForm = () => {
    setLogFormData({
      log_date: new Date().toISOString().split('T')[0],
      start_time: '',
      end_time: '',
      odometer_start: 0,
      odometer_end: 0,
      destination: '',
      purpose: '',
      fuel_added: 0,
      notes: '',
    });
  };

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

  return (
    <div className="space-y-6" data-testid="vehicles-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Vehicles</h1>
          <p className="text-slate-600">Manage client vehicles and logbooks</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-vehicle-button">
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Add New Vehicle</DialogTitle>
              <DialogDescription>Register a vehicle for tracking and logbook</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">Make *</Label>
                  <Input
                    id="make"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    placeholder="Toyota"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model *</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Camry"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year *</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registration">Registration *</Label>
                  <Input
                    id="registration"
                    value={formData.registration}
                    onChange={(e) => setFormData({ ...formData, registration: e.target.value })}
                    placeholder="ABC123"
                    required
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="vin">VIN</Label>
                  <Input
                    id="vin"
                    value={formData.vin}
                    onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                    placeholder="Vehicle Identification Number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner_type">Owner Type *</Label>
                  <Select
                    value={formData.owner_type}
                    onValueChange={(value) => setFormData({ ...formData, owner_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="organization">Organization</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.owner_type === 'client' && (
                  <div className="space-y-2">
                    <Label htmlFor="owner_id">Owner (Client)</Label>
                    <Select
                      value={formData.owner_id}
                      onValueChange={(value) => setFormData({ ...formData, owner_id: value })}
                    >
                      <SelectTrigger>
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
                )}
                <div className="space-y-2">
                  <Label htmlFor="registration_expiry">Registration Expiry</Label>
                  <Input
                    id="registration_expiry"
                    type="date"
                    value={formData.registration_expiry}
                    onChange={(e) => setFormData({ ...formData, registration_expiry: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insurance_expiry">Insurance Expiry</Label>
                  <Input
                    id="insurance_expiry"
                    type="date"
                    value={formData.insurance_expiry}
                    onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">Add Vehicle</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="vehicles" className="w-full">
        <TabsList>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="logbook">Logbook</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-manrope font-semibold">All Vehicles</h2>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading vehicles...</div>
              ) : vehicles.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No vehicles registered. Add your first vehicle to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Registration</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Reg. Expiry</TableHead>
                      <TableHead>Insurance Expiry</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((vehicle) => (
                      <TableRow key={vehicle.id} className="table-row">
                        <TableCell className="font-medium">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </TableCell>
                        <TableCell>{vehicle.registration}</TableCell>
                        <TableCell>{vehicle.owner_name || 'N/A'}</TableCell>
                        <TableCell>{vehicle.registration_expiry || 'N/A'}</TableCell>
                        <TableCell>{vehicle.insurance_expiry || 'N/A'}</TableCell>
                        <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setSelectedVehicle(vehicle); setIsLogDialogOpen(true); }}
                            >
                              <BookOpen className="w-4 h-4 mr-1" />
                              Add Log
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(vehicle.id)}
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
        </TabsContent>

        <TabsContent value="logbook">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-manrope font-semibold">Vehicle Logbook</h2>
              </div>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No logbook entries yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Odometer</TableHead>
                      <TableHead>Fuel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} className="table-row">
                        <TableCell>{log.log_date}</TableCell>
                        <TableCell className="font-medium">{log.vehicle_registration}</TableCell>
                        <TableCell>{log.driver_name}</TableCell>
                        <TableCell>{log.destination}</TableCell>
                        <TableCell>
                          {log.odometer_start} - {log.odometer_end || 'N/A'}
                        </TableCell>
                        <TableCell>{log.fuel_added ? `${log.fuel_added}L` : 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isLogDialogOpen} onOpenChange={(open) => { setIsLogDialogOpen(open); if (!open) resetLogForm(); }}>
        <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Add Logbook Entry</DialogTitle>
            <DialogDescription>
              {selectedVehicle && `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.registration})`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="log_date">Date *</Label>
                <Input
                  id="log_date"
                  type="date"
                  value={logFormData.log_date}
                  onChange={(e) => setLogFormData({ ...logFormData, log_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose *</Label>
                <Input
                  id="purpose"
                  value={logFormData.purpose}
                  onChange={(e) => setLogFormData({ ...logFormData, purpose: e.target.value })}
                  placeholder="Client transport"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={logFormData.start_time}
                  onChange={(e) => setLogFormData({ ...logFormData, start_time: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={logFormData.end_time}
                  onChange={(e) => setLogFormData({ ...logFormData, end_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="odometer_start">Odometer Start (km) *</Label>
                <Input
                  id="odometer_start"
                  type="number"
                  value={logFormData.odometer_start}
                  onChange={(e) => setLogFormData({ ...logFormData, odometer_start: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="odometer_end">Odometer End (km)</Label>
                <Input
                  id="odometer_end"
                  type="number"
                  value={logFormData.odometer_end}
                  onChange={(e) => setLogFormData({ ...logFormData, odometer_end: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="destination">Destination *</Label>
                <Input
                  id="destination"
                  value={logFormData.destination}
                  onChange={(e) => setLogFormData({ ...logFormData, destination: e.target.value })}
                  placeholder="123 Main St, Sydney"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuel_added">Fuel Added (L)</Label>
                <Input
                  id="fuel_added"
                  type="number"
                  step="0.1"
                  value={logFormData.fuel_added}
                  onChange={(e) => setLogFormData({ ...logFormData, fuel_added: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={logFormData.notes}
                  onChange={(e) => setLogFormData({ ...logFormData, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => { setIsLogDialogOpen(false); resetLogForm(); }}>
                Cancel
              </Button>
              <Button type="submit">Add Log Entry</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vehicles;