import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Plus, FileText, Trash2, Download, Printer, Send, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

// NDIS Support Categories
const NDIS_CATEGORIES = [
  { code: '01', name: 'Assistance with Daily Life' },
  { code: '02', name: 'Transport' },
  { code: '03', name: 'Consumables' },
  { code: '04', name: 'Assistance with Social & Community Participation' },
  { code: '07', name: 'Coordination of Supports' },
  { code: '09', name: 'Increased Social & Community Participation' },
  { code: '12', name: 'Improved Health & Wellbeing' },
  { code: '15', name: 'Improved Daily Living Skills' },
];

// Payment Terms Options
const PAYMENT_TERMS = [
  { value: '7', label: 'Net 7 Days' },
  { value: '14', label: 'Net 14 Days' },
  { value: '30', label: 'Net 30 Days' },
  { value: 'due_on_receipt', label: 'Due on Receipt' },
];

// Professional Invoice View Template
const InvoiceTemplate = ({ invoice, client, onClose }) => {
  const handlePrint = () => window.print();
  const handleDownload = () => {
    window.print();
    toast.success('Use "Save as PDF" in the print dialog');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-auto">
        <div className="print:hidden sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Invoice Preview</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />Download PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />Print
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-8 print:p-12" id="invoice-content">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              <img src="/procare-logo.png" alt="ProCare Hub" className="h-16 w-auto" />
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-emerald-600 tracking-tight">INVOICE</h1>
              <p className="text-lg font-semibold text-slate-700 mt-1">#{invoice.invoice_number}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">From</h3>
              <p className="font-semibold text-lg text-slate-900">ProCare Hub</p>
              <p className="text-slate-600">NDIS Provider Services</p>
              <p className="text-slate-600">ABN: XX XXX XXX XXX</p>
              <p className="text-slate-600 mt-2">support@procare-hub.com</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">Bill To</h3>
              <p className="font-semibold text-lg text-slate-900">{client?.full_name || invoice.client_name}</p>
              {client?.ndis_number && <p className="text-slate-600">NDIS #: {client.ndis_number}</p>}
              {client?.email && <p className="text-slate-600">{client.email}</p>}
              {client?.phone && <p className="text-slate-600">{client.phone}</p>}
            </div>
          </div>

          <div className="bg-emerald-50 rounded-lg p-4 mb-8">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase">Invoice Date</p>
                <p className="text-slate-900 font-medium">{invoice.created_at?.split('T')[0]}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase">Due Date</p>
                <p className="text-slate-900 font-medium">{invoice.due_date || 'On Receipt'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase">Service Period</p>
                <p className="text-slate-900 font-medium">{invoice.service_period_start} to {invoice.service_period_end}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase">Status</p>
                <span className={`inline-flex px-2 py-0.5 rounded text-sm font-medium ${
                  invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                  invoice.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                  invoice.status === 'overdue' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                }`}>{invoice.status?.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="bg-emerald-600 text-white">
                <th className="text-left py-3 px-4 text-sm font-semibold uppercase">SL</th>
                <th className="text-left py-3 px-4 text-sm font-semibold uppercase">Description</th>
                <th className="text-center py-3 px-4 text-sm font-semibold uppercase">Qty</th>
                <th className="text-right py-3 px-4 text-sm font-semibold uppercase">Rate</th>
                <th className="text-right py-3 px-4 text-sm font-semibold uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items?.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="py-3 px-4 text-emerald-600 font-semibold">{String(index + 1).padStart(2, '0')}</td>
                  <td className="py-3 px-4 text-slate-800">{item.description}</td>
                  <td className="py-3 px-4 text-center text-slate-600">{item.quantity}</td>
                  <td className="py-3 px-4 text-right text-slate-600">${parseFloat(item.rate).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-slate-900 font-medium">${parseFloat(item.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between mb-8">
            <div className="max-w-sm">
              <p className="text-emerald-600 font-semibold mb-2">Thank you for your business</p>
              <p className="text-sm text-slate-500">Terms & Conditions:</p>
              <p className="text-xs text-slate-400">Payment is due within the specified terms. NDIS services are GST-free.</p>
            </div>
            <div className="w-64">
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium">${parseFloat(invoice.total_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="text-slate-600">GST (0%)</span>
                <span className="font-medium">$0.00</span>
              </div>
              <div className="flex justify-between py-3 bg-emerald-600 text-white px-3 -mx-3 mt-2 rounded">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">${parseFloat(invoice.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6 text-center text-sm text-slate-500">
            <p>Questions? Contact us at support@procare-hub.com</p>
          </div>
        </div>
      </div>
      <style>{`@media print { body * { visibility: hidden; } #invoice-content, #invoice-content * { visibility: visible; } #invoice-content { position: absolute; left: 0; top: 0; width: 100%; } .print\\:hidden { display: none !important; } }`}</style>
    </div>
  );
};

// Enhanced Invoice-Style Create Form
const CreateInvoiceForm = ({ clients, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    client_id: '',
    service_period_start: '',
    service_period_end: '',
    due_date: '',
    payment_terms: '14',
    reference_number: '',
    ndis_category: '',
    claim_type: 'standard',
    notes: '',
    line_items: [{ description: '', support_item_number: '', quantity: 1, rate: 0, amount: 0 }],
  });

  const selectedClient = clients.find(c => c.id === formData.client_id);
  const subtotal = formData.line_items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const total = subtotal;

  const addLineItem = () => {
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { description: '', support_item_number: '', quantity: 1, rate: 0, amount: 0 }],
    });
  };

  const updateLineItem = (index, field, value) => {
    const items = [...formData.line_items];
    items[index][field] = value;
    if (field === 'quantity' || field === 'rate') {
      items[index].amount = (items[index].quantity || 0) * (items[index].rate || 0);
    }
    setFormData({ ...formData, line_items: items });
  };

  const removeLineItem = (index) => {
    if (formData.line_items.length > 1) {
      setFormData({ ...formData, line_items: formData.line_items.filter((_, i) => i !== index) });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="bg-white">
      {/* Decorative Corner */}
      <div className="absolute top-0 right-0 w-32 h-32 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500 rotate-45 translate-x-20 -translate-y-20"></div>
      </div>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-6 relative">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
            <img src="/procare-logo.png" alt="ProCare Hub" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">ProCare Hub</h2>
            <p className="text-sm text-slate-500">NDIS Provider Services</p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-3xl font-bold text-emerald-500 tracking-tight">INVOICE</h1>
          <p className="text-sm text-slate-500 mt-1">New Invoice</p>
        </div>
      </div>

      {/* Invoice Details Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6 text-sm">
        <div>
          <Label className="text-slate-500 text-xs uppercase tracking-wide">Invoice Date</Label>
          <p className="font-medium text-slate-800 mt-1">{today}</p>
        </div>
        <div>
          <Label className="text-slate-500 text-xs uppercase tracking-wide">Due Date</Label>
          <Input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="mt-1 h-8 text-sm border-slate-300"
          />
        </div>
        <div>
          <Label className="text-slate-500 text-xs uppercase tracking-wide">Reference No</Label>
          <Input
            placeholder="PO-000"
            value={formData.reference_number}
            onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
            className="mt-1 h-8 text-sm border-slate-300"
          />
        </div>
        <div>
          <Label className="text-slate-500 text-xs uppercase tracking-wide">Payment Terms</Label>
          <Select value={formData.payment_terms} onValueChange={(v) => setFormData({ ...formData, payment_terms: v })}>
            <SelectTrigger className="mt-1 h-8 text-sm border-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_TERMS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bill To Section */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-slate-50 rounded-lg p-4">
          <Label className="text-emerald-600 text-xs font-semibold uppercase tracking-wide mb-2 block">Bill To (Participant)</Label>
          <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
            <SelectTrigger className="bg-white border-slate-300" data-testid="invoice-client-select">
              <SelectValue placeholder="Select participant..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="font-medium">{c.full_name}</span>
                  <span className="text-slate-400 ml-2">• {c.ndis_number}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedClient && (
            <div className="mt-3 text-sm text-slate-600 space-y-1">
              <p className="font-medium text-slate-800">{selectedClient.full_name}</p>
              <p>NDIS: {selectedClient.ndis_number}</p>
              {selectedClient.email && <p>{selectedClient.email}</p>}
            </div>
          )}
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <Label className="text-emerald-600 text-xs font-semibold uppercase tracking-wide mb-2 block">Service Period</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Start Date *</Label>
              <Input
                type="date"
                data-testid="invoice-start-input"
                value={formData.service_period_start}
                onChange={(e) => setFormData({ ...formData, service_period_start: e.target.value })}
                className="mt-1 bg-white border-slate-300"
                required
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500">End Date *</Label>
              <Input
                type="date"
                data-testid="invoice-end-input"
                value={formData.service_period_end}
                onChange={(e) => setFormData({ ...formData, service_period_end: e.target.value })}
                className="mt-1 bg-white border-slate-300"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <Label className="text-xs text-slate-500">NDIS Category</Label>
              <Select value={formData.ndis_category} onValueChange={(v) => setFormData({ ...formData, ndis_category: v })}>
                <SelectTrigger className="mt-1 bg-white border-slate-300 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {NDIS_CATEGORIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Claim Type</Label>
              <Select value={formData.claim_type} onValueChange={(v) => setFormData({ ...formData, claim_type: v })}>
                <SelectTrigger className="mt-1 bg-white border-slate-300 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="plan_managed">Plan Managed</SelectItem>
                  <SelectItem value="self_managed">Self Managed</SelectItem>
                  <SelectItem value="ndia_managed">NDIA Managed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <Label className="text-emerald-600 text-xs font-semibold uppercase tracking-wide">Service Items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="text-emerald-600 border-emerald-300 hover:bg-emerald-50" data-testid="add-line-item-button">
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </div>
        
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-emerald-500 text-white">
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase w-12">SL</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase">Service Description</th>
                <th className="text-left py-3 px-4 text-xs font-semibold uppercase w-36">Item Number</th>
                <th className="text-center py-3 px-4 text-xs font-semibold uppercase w-20">Qty</th>
                <th className="text-right py-3 px-4 text-xs font-semibold uppercase w-24">Rate</th>
                <th className="text-right py-3 px-4 text-xs font-semibold uppercase w-28">Total</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {formData.line_items.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="py-2 px-4 text-emerald-600 font-semibold">{String(index + 1).padStart(2, '0')}</td>
                  <td className="py-2 px-4">
                    <Input
                      placeholder="e.g., Personal Care Support"
                      data-testid={`line-item-description-${index}`}
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      className="border-0 bg-transparent p-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                      required
                    />
                  </td>
                  <td className="py-2 px-4">
                    <Input
                      placeholder="01_011_0107"
                      value={item.support_item_number}
                      onChange={(e) => updateLineItem(index, 'support_item_number', e.target.value)}
                      className="border-0 bg-transparent p-0 h-8 text-sm font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      data-testid={`line-item-quantity-${index}`}
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="border-0 bg-transparent p-0 h-8 text-center focus-visible:ring-0 focus-visible:ring-offset-0"
                      required
                    />
                  </td>
                  <td className="py-2 px-4">
                    <div className="flex items-center justify-end">
                      <span className="text-slate-400 mr-1">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        data-testid={`line-item-rate-${index}`}
                        value={item.rate}
                        onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        className="border-0 bg-transparent p-0 h-8 text-right w-16 focus-visible:ring-0 focus-visible:ring-offset-0"
                        required
                      />
                    </div>
                  </td>
                  <td className="py-2 px-4 text-right font-medium text-slate-800">
                    ${(item.amount || 0).toFixed(2)}
                  </td>
                  <td className="py-2 px-2">
                    {formData.line_items.length > 1 && (
                      <button type="button" onClick={() => removeLineItem(index)} className="text-rose-400 hover:text-rose-600 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Section */}
      <div className="flex justify-between items-start mb-6">
        <div className="max-w-sm">
          <Label className="text-emerald-600 text-xs font-semibold uppercase tracking-wide mb-2 block">Notes</Label>
          <Textarea
            placeholder="Additional notes for the invoice..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="border-slate-300 text-sm min-h-[80px]"
          />
        </div>
        
        {/* Totals */}
        <div className="w-64">
          <div className="flex justify-between py-2 border-b border-slate-200 text-sm">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-medium text-slate-800">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-200 text-sm">
            <span className="text-slate-600">GST (0%)</span>
            <span className="font-medium text-slate-800">$0.00</span>
          </div>
          <div className="flex justify-between py-3 bg-emerald-500 text-white px-4 -mx-4 mt-2 rounded-lg">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-xl">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 px-8" data-testid="invoice-submit-button">
          Create Invoice
        </Button>
      </div>

      {/* Decorative Bottom Corner */}
      <div className="absolute bottom-0 left-0 w-24 h-24 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500 rotate-45 -translate-x-16 translate-y-16"></div>
      </div>
    </form>
  );
};

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [invoicesRes, clientsRes] = await Promise.all([
        axios.get(`${API}/invoices`, getAuthHeader()),
        axios.get(`${API}/clients`, getAuthHeader()),
      ]);
      setInvoices(invoicesRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    }
    setLoading(false);
  };

  const handleSubmit = async (formData) => {
    try {
      await axios.post(`${API}/invoices`, formData, getAuthHeader());
      toast.success('Invoice created successfully');
      fetchData();
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await axios.put(`${API}/invoices/${id}`, { status }, getAuthHeader());
      toast.success('Invoice status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleViewInvoice = (invoice) => {
    const client = clients.find(c => c.id === invoice.client_id);
    setSelectedInvoice({ ...invoice, clientData: client });
    setShowInvoicePreview(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-slate-100 text-slate-700',
      sent: 'bg-blue-50 text-blue-700',
      paid: 'bg-emerald-50 text-emerald-700',
      overdue: 'bg-rose-50 text-rose-700',
    };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.draft}`}>{status?.toUpperCase()}</span>;
  };

  return (
    <div className="space-y-6" data-testid="invoices-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Invoices</h1>
          <p className="text-slate-600">Manage NDIS billing and payments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600" data-testid="create-invoice-button">
              <Plus className="w-4 h-4 mr-2" />Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto relative" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader className="sr-only"><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
            <CreateInvoiceForm clients={clients} onSubmit={handleSubmit} onCancel={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: invoices.length, bg: 'bg-slate-50', color: 'text-slate-900' },
          { label: 'Paid', value: invoices.filter(i => i.status === 'paid').length, bg: 'bg-emerald-50', color: 'text-emerald-600' },
          { label: 'Pending', value: invoices.filter(i => i.status === 'sent').length, bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: 'Overdue', value: invoices.filter(i => i.status === 'overdue').length, bg: 'bg-rose-50', color: 'text-rose-600' },
        ].map((stat, i) => (
          <Card key={i} className={`border-0 ${stat.bg}`}>
            <CardContent className="pt-4">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-slate-900">All Invoices</h2>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-slate-500" data-testid="no-invoices-message">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No invoices yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Invoice #</TableHead>
                  <TableHead className="font-semibold">Client</TableHead>
                  <TableHead className="font-semibold">Period</TableHead>
                  <TableHead className="font-semibold">Amount</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-slate-50" data-testid={`invoice-row-${invoice.id}`}>
                    <TableCell className="font-semibold text-emerald-600">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.client_name}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{invoice.service_period_start} → {invoice.service_period_end}</TableCell>
                    <TableCell className="font-semibold">${invoice.total_amount?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Select value={invoice.status} onValueChange={(v) => handleStatusChange(invoice.id, v)}>
                        <SelectTrigger className="w-28 border-0 bg-transparent p-0 h-auto">
                          <SelectValue>{getStatusBadge(invoice.status)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleViewInvoice(invoice)} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" data-testid={`view-invoice-${invoice.id}`}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showInvoicePreview && selectedInvoice && (
        <InvoiceTemplate invoice={selectedInvoice} client={selectedInvoice.clientData} onClose={() => setShowInvoicePreview(false)} />
      )}
    </div>
  );
};

export default Invoices;
