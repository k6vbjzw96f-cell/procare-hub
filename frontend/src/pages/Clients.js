import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    ndis_number: '',
    email: '',
    phone: '',
    address: '',
    plan_start_date: '',
    plan_end_date: '',
    total_budget: 0,
    support_needs: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients`, getAuthHeader());
      setClients(response.data);
    } catch (error) {
      toast.error('Failed to load clients');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await axios.put(`${API}/clients/${editingClient.id}`, formData, getAuthHeader());
        toast.success('Client updated successfully');
      } else {
        await axios.post(`${API}/clients`, formData, getAuthHeader());
        toast.success('Client created successfully');
      }
      fetchClients();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    try {
      await axios.delete(`${API}/clients/${id}`, getAuthHeader());
      toast.success('Client deleted successfully');
      fetchClients();
    } catch (error) {
      toast.error('Failed to delete client');
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      ndis_number: '',
      email: '',
      phone: '',
      address: '',
      plan_start_date: '',
      plan_end_date: '',
      total_budget: 0,
      support_needs: '',
    });
    setEditingClient(null);
  };

  const openEditDialog = (client) => {
    setEditingClient(client);
    setFormData({
      full_name: client.full_name,
      ndis_number: client.ndis_number,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      plan_start_date: client.plan_start_date || '',
      plan_end_date: client.plan_end_date || '',
      total_budget: client.total_budget,
      support_needs: client.support_needs || '',
    });
    setIsDialogOpen(true);
  };

  const filteredClients = clients.filter((client) =>
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.ndis_number.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="space-y-6" data-testid="clients-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-manrope font-bold text-primary-900 mb-2">Clients</h1>
          <p className="text-slate-600">Manage NDIS participants and their care plans</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-client-button">
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
              <DialogDescription>Enter client details and NDIS information</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    data-testid="client-name-input"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ndis_number">NDIS Number *</Label>
                  <Input
                    id="ndis_number"
                    data-testid="client-ndis-input"
                    value={formData.ndis_number}
                    onChange={(e) => setFormData({ ...formData, ndis_number: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    data-testid="client-email-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    data-testid="client-phone-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    data-testid="client-address-input"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan_start_date">Plan Start Date</Label>
                  <Input
                    id="plan_start_date"
                    type="date"
                    data-testid="client-plan-start-input"
                    value={formData.plan_start_date}
                    onChange={(e) => setFormData({ ...formData, plan_start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan_end_date">Plan End Date</Label>
                  <Input
                    id="plan_end_date"
                    type="date"
                    data-testid="client-plan-end-input"
                    value={formData.plan_end_date}
                    onChange={(e) => setFormData({ ...formData, plan_end_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_budget">Total Budget ($)</Label>
                  <Input
                    id="total_budget"
                    type="number"
                    data-testid="client-budget-input"
                    value={formData.total_budget}
                    onChange={(e) => setFormData({ ...formData, total_budget: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="support_needs">Support Needs</Label>
                  <Input
                    id="support_needs"
                    data-testid="client-support-input"
                    value={formData.support_needs}
                    onChange={(e) => setFormData({ ...formData, support_needs: e.target.value })}
                    placeholder="Describe support requirements..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="client-submit-button">
                  {editingClient ? 'Update Client' : 'Create Client'}
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
                placeholder="Search clients..."
                data-testid="client-search-input"
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading clients...</div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8 text-slate-500" data-testid="no-clients-message">
              No clients found. Add your first client to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>NDIS Number</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id} className="table-row" data-testid={`client-row-${client.id}`}>
                    <TableCell className="font-medium">{client.full_name}</TableCell>
                    <TableCell>{client.ndis_number}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{client.email || 'N/A'}</div>
                        <div className="text-slate-500">{client.phone || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">${client.total_budget.toLocaleString()}</div>
                        <div className="text-slate-500">Spent: ${client.spent_budget.toLocaleString()}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(client.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`edit-client-${client.id}`}
                          onClick={() => openEditDialog(client)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`delete-client-${client.id}`}
                          onClick={() => handleDelete(client.id)}
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

export default Clients;