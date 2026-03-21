import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Home, Users, Pencil, Trash2, UserPlus, UserMinus } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const SILHouses = () => {
  const [houses, setHouses] = useState([]);
  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isResidentDialogOpen, setIsResidentDialogOpen] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [formData, setFormData] = useState({
    property_name: '',
    address: '',
    property_type: 'house',
    bedrooms: 0,
    capacity: 0,
    features: [],
    manager_id: '',
  });
  const [featureInput, setFeatureInput] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [housesRes, clientsRes, staffRes] = await Promise.all([
        axios.get(`${API}/houses`, getAuthHeader()),
        axios.get(`${API}/clients`, getAuthHeader()),
        axios.get(`${API}/staff`, getAuthHeader()),
      ]);
      setHouses(housesRes.data);
      setClients(clientsRes.data);
      setStaff(staffRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/houses`, formData, getAuthHeader());
      toast.success('SIL House added successfully');
      fetchData();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add house');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this house?')) return;
    try {
      await axios.delete(`${API}/houses/${id}`, getAuthHeader());
      toast.success('House deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete house');
    }
  };

  const handleAddResident = async () => {
    if (!selectedHouse || !selectedClientId) return;
    try {
      await axios.post(`${API}/houses/${selectedHouse.id}/residents/${selectedClientId}`, {}, getAuthHeader());
      toast.success('Resident added successfully');
      fetchData();
      setIsResidentDialogOpen(false);
      setSelectedClientId('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add resident');
    }
  };

  const handleRemoveResident = async (houseId, clientId) => {
    if (!window.confirm('Remove this resident from the house?')) return;
    try {
      await axios.delete(`${API}/houses/${houseId}/residents/${clientId}`, getAuthHeader());
      toast.success('Resident removed successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove resident');
    }
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, featureInput.trim()],
      });
      setFeatureInput('');
    }
  };

  const removeFeature = (index) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  const resetForm = () => {
    setFormData({
      property_name: '',
      address: '',
      property_type: 'house',
      bedrooms: 0,
      capacity: 0,
      features: [],
      manager_id: '',
    });
    setFeatureInput('');
  };

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.full_name : 'Unknown';
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      inactive: 'bg-slate-100 text-slate-700 border-slate-200',
      maintenance: 'bg-amber-50 text-amber-700 border-amber-100',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.active}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6" data-testid="sil-houses-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">SIL Houses</h1>
          <p className="text-slate-600">Manage Supported Independent Living properties</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-house-button">
              <Plus className="w-4 h-4 mr-2" />
              Add House
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Add New SIL House</DialogTitle>
              <DialogDescription>Register a new property for SIL services</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="property_name">Property Name *</Label>
                  <Input
                    id="property_name"
                    value={formData.property_name}
                    onChange={(e) => setFormData({ ...formData, property_name: e.target.value })}
                    placeholder="Sunrise House"
                    required
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main Street, Sydney NSW 2000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property_type">Property Type *</Label>
                  <Select
                    value={formData.property_type}
                    onValueChange={(value) => setFormData({ ...formData, property_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="unit">Unit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Bedrooms *</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manager_id">Property Manager</Label>
                  <Select
                    value={formData.manager_id}
                    onValueChange={(value) => setFormData({ ...formData, manager_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager" />
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
                <div className="space-y-2 col-span-2">
                  <Label>Features / Amenities</Label>
                  <div className="flex gap-2">
                    <Input
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      placeholder="e.g., Wheelchair accessible"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    />
                    <Button type="button" onClick={addFeature} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {feature}
                        <button type="button" onClick={() => removeFeature(index)} className="ml-1">
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">Add House</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-manrope font-semibold">All SIL Properties</h2>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading houses...</div>
          ) : houses.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No SIL houses registered. Add your first property to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Occupancy</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {houses.map((house) => (
                  <TableRow key={house.id} className="table-row">
                    <TableCell className="font-medium">{house.property_name}</TableCell>
                    <TableCell>{house.address}</TableCell>
                    <TableCell className="capitalize">{house.property_type}</TableCell>
                    <TableCell>{house.capacity}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        {house.current_occupancy}/{house.capacity}
                      </div>
                    </TableCell>
                    <TableCell>{house.manager_name || 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(house.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelectedHouse(house); setIsResidentDialogOpen(true); }}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Residents
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(house.id)}
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

      <Dialog open={isResidentDialogOpen} onOpenChange={setIsResidentDialogOpen}>
        <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Manage Residents</DialogTitle>
            <DialogDescription>
              {selectedHouse && `${selectedHouse.property_name} - ${selectedHouse.current_occupancy}/${selectedHouse.capacity} occupancy`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Add Resident</Label>
              <div className="flex gap-2">
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.filter((c) => !selectedHouse?.residents?.includes(c.id)).map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddResident}>
                  <UserPlus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Current Residents</Label>
              {selectedHouse?.residents?.length === 0 ? (
                <p className="text-sm text-slate-500">No residents currently</p>
              ) : (
                <div className="space-y-2">
                  {selectedHouse?.residents?.map((residentId) => (
                    <div key={residentId} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">{getClientName(residentId)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveResident(selectedHouse.id, residentId)}
                        className="text-rose-600 hover:text-rose-700"
                      >
                        <UserMinus className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SILHouses;
