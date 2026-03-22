import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Plus, FileText, Trash2, Download, Printer, Send, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

// Professional Invoice Template Component
const InvoiceTemplate = ({ invoice, client, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Trigger print dialog which can save as PDF
    window.print();
    toast.success('Use "Save as PDF" in the print dialog');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-auto">
        {/* Action Bar - Hidden in print */}
        <div className="print:hidden sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Invoice Preview</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="p-8 print:p-12" id="invoice-content">
          {/* Header with Branding */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              <img src="/procare-logo.png" alt="ProCare Hub" className="h-16 w-auto" />
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-emerald-700 tracking-tight">INVOICE</h1>
              <p className="text-lg font-semibold text-slate-700 mt-1">#{invoice.invoice_number}</p>
            </div>
          </div>

          {/* Company & Client Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wider mb-3">From</h3>
              <div className="text-slate-700">
                <p className="font-semibold text-lg text-slate-900">ProCare Hub</p>
                <p className="text-slate-600">NDIS Provider Services</p>
                <p className="text-slate-600">ABN: XX XXX XXX XXX</p>
                <p className="text-slate-600 mt-2">support@procare-hub.com</p>
                <p className="text-slate-600">www.procare-hub.com</p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wider mb-3">Bill To</h3>
              <div className="text-slate-700">
                <p className="font-semibold text-lg text-slate-900">{client?.full_name || invoice.client_name}</p>
                {client?.ndis_number && (
                  <p className="text-slate-600">NDIS #: {client.ndis_number}</p>
                )}
                {client?.email && (
                  <p className="text-slate-600">{client.email}</p>
                )}
                {client?.phone && (
                  <p className="text-slate-600">{client.phone}</p>
                )}
                {client?.address && (
                  <p className="text-slate-600">{client.address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 mb-8">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Invoice Date</p>
                <p className="text-slate-900 font-medium">{invoice.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Service Period</p>
                <p className="text-slate-900 font-medium">{invoice.service_period_start} to {invoice.service_period_end}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Status</p>
                <span className={`inline-flex px-2 py-0.5 rounded text-sm font-medium ${
                  invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                  invoice.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                  invoice.status === 'overdue' ? 'bg-rose-100 text-rose-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {invoice.status?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-emerald-200">
                  <th className="text-left py-3 text-sm font-semibold text-emerald-700 uppercase tracking-wider">Description</th>
                  <th className="text-center py-3 text-sm font-semibold text-emerald-700 uppercase tracking-wider w-24">Qty</th>
                  <th className="text-right py-3 text-sm font-semibold text-emerald-700 uppercase tracking-wider w-32">Rate</th>
                  <th className="text-right py-3 text-sm font-semibold text-emerald-700 uppercase tracking-wider w-32">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.line_items?.map((item, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td className="py-4 text-slate-800 font-medium">{item.description}</td>
                    <td className="py-4 text-center text-slate-600">{item.quantity}</td>
                    <td className="py-4 text-right text-slate-600">${parseFloat(item.rate).toFixed(2)}</td>
                    <td className="py-4 text-right text-slate-900 font-medium">${parseFloat(item.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-72">
              <div className="flex justify-between py-2 text-slate-600">
                <span>Subtotal</span>
                <span>${parseFloat(invoice.total_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 text-slate-600">
                <span>GST (0%)</span>
                <span>$0.00</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between py-3">
                <span className="text-lg font-bold text-slate-900">Total Due</span>
                <span className="text-2xl font-bold text-emerald-700">${parseFloat(invoice.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-slate-50 rounded-lg p-6 mb-8">
            <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wider mb-3">Payment Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
              <div>
                <p><span className="font-medium text-slate-700">Bank:</span> Commonwealth Bank</p>
                <p><span className="font-medium text-slate-700">Account Name:</span> ProCare Hub Pty Ltd</p>
              </div>
              <div>
                <p><span className="font-medium text-slate-700">BSB:</span> XXX-XXX</p>
                <p><span className="font-medium text-slate-700">Account:</span> XXXX XXXX</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-3">
              Please include invoice number <span className="font-semibold text-slate-700">{invoice.invoice_number}</span> as payment reference.
            </p>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 pt-6 text-center">
            <p className="text-slate-500 text-sm">
              Thank you for choosing ProCare Hub for your NDIS support services.
            </p>
            <p className="text-emerald-600 text-sm font-medium mt-1">
              Questions? Contact us at support@procare-hub.com
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-content, #invoice-content * {
            visibility: visible;
          }
          #invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    service_period_start: '',
    service_period_end: '',
    line_items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
  });

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/invoices`, formData, getAuthHeader());
      toast.success('Invoice created successfully');
      fetchData();
      setIsDialogOpen(false);
      resetForm();
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

  const addLineItem = () => {
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { description: '', quantity: 1, rate: 0, amount: 0 }],
    });
  };

  const updateLineItem = (index, field, value) => {
    const items = [...formData.line_items];
    items[index][field] = value;
    if (field === 'quantity' || field === 'rate') {
      items[index].amount = items[index].quantity * items[index].rate;
    }
    setFormData({ ...formData, line_items: items });
  };

  const removeLineItem = (index) => {
    const items = formData.line_items.filter((_, i) => i !== index);
    setFormData({ ...formData, line_items: items });
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      service_period_start: '',
      service_period_end: '',
      line_items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-slate-100 text-slate-700 border-slate-200',
      sent: 'bg-blue-50 text-blue-700 border-blue-100',
      paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      overdue: 'bg-rose-50 text-rose-700 border-rose-100',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.draft}`}>
        {status?.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6" data-testid="invoices-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Invoices</h1>
          <p className="text-slate-600">Manage NDIS billing and payments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700" data-testid="create-invoice-button">
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="text-emerald-700">Create New Invoice</DialogTitle>
              <DialogDescription>Generate NDIS compliant invoice</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-3">
                  <Label htmlFor="client_id" className="text-slate-700 font-medium">Client *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                    required
                  >
                    <SelectTrigger data-testid="invoice-client-select" className="border-slate-300">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name} - {client.ndis_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service_period_start" className="text-slate-700 font-medium">Period Start *</Label>
                  <Input
                    id="service_period_start"
                    type="date"
                    data-testid="invoice-start-input"
                    value={formData.service_period_start}
                    onChange={(e) => setFormData({ ...formData, service_period_start: e.target.value })}
                    required
                    className="border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service_period_end" className="text-slate-700 font-medium">Period End *</Label>
                  <Input
                    id="service_period_end"
                    type="date"
                    data-testid="invoice-end-input"
                    value={formData.service_period_end}
                    onChange={(e) => setFormData({ ...formData, service_period_end: e.target.value })}
                    required
                    className="border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-700 font-medium">Line Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem} data-testid="add-line-item-button" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                    <Plus className="w-4 h-4 mr-1" /> Add Item
                  </Button>
                </div>
                {formData.line_items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end bg-slate-50 p-3 rounded-lg">
                    <div className="col-span-5 space-y-2">
                      <Label className="text-xs text-slate-600">Description</Label>
                      <Input
                        placeholder="Service description"
                        data-testid={`line-item-description-${index}`}
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        required
                        className="border-slate-300"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs text-slate-600">Qty</Label>
                      <Input
                        type="number"
                        data-testid={`line-item-quantity-${index}`}
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value))}
                        required
                        className="border-slate-300"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs text-slate-600">Rate</Label>
                      <Input
                        type="number"
                        step="0.01"
                        data-testid={`line-item-rate-${index}`}
                        value={item.rate}
                        onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value))}
                        required
                        className="border-slate-300"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs text-slate-600">Amount</Label>
                      <Input
                        type="number"
                        value={item.amount.toFixed(2)}
                        disabled
                        data-testid={`line-item-amount-${index}`}
                        className="bg-emerald-50 border-emerald-200 font-medium"
                      />
                    </div>
                    <div className="col-span-1">
                      {formData.line_items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(index)}
                          className="text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Total:</span>
                    <span className="text-2xl font-bold text-emerald-700">
                      ${formData.line_items.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" data-testid="invoice-submit-button">
                  Create Invoice
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: invoices.length, color: 'text-slate-900' },
          { label: 'Paid', value: invoices.filter(i => i.status === 'paid').length, color: 'text-emerald-600' },
          { label: 'Pending', value: invoices.filter(i => i.status === 'sent').length, color: 'text-blue-600' },
          { label: 'Overdue', value: invoices.filter(i => i.status === 'overdue').length, color: 'text-rose-600' },
        ].map((stat, i) => (
          <Card key={i} className="border-slate-200">
            <CardContent className="pt-4">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">All Invoices</h2>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-slate-500" data-testid="no-invoices-message">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No invoices created yet.</p>
              <p className="text-sm">Create your first invoice to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold text-slate-700">Invoice #</TableHead>
                  <TableHead className="font-semibold text-slate-700">Client</TableHead>
                  <TableHead className="font-semibold text-slate-700">Service Period</TableHead>
                  <TableHead className="font-semibold text-slate-700">Amount</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-slate-50" data-testid={`invoice-row-${invoice.id}`}>
                    <TableCell className="font-semibold text-emerald-700">{invoice.invoice_number}</TableCell>
                    <TableCell className="text-slate-700">{invoice.client_name}</TableCell>
                    <TableCell className="text-slate-600">
                      {invoice.service_period_start} to {invoice.service_period_end}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">${invoice.total_amount?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Select value={invoice.status} onValueChange={(value) => handleStatusChange(invoice.id, value)}>
                        <SelectTrigger className="w-32 border-0 bg-transparent p-0 h-auto">
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
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewInvoice(invoice)}
                          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          data-testid={`view-invoice-${invoice.id}`}
                        >
                          View
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-slate-500 hover:text-emerald-600"
                        >
                          <Send className="w-4 h-4" />
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

      {/* Invoice Preview Modal */}
      {showInvoicePreview && selectedInvoice && (
        <InvoiceTemplate 
          invoice={selectedInvoice} 
          client={selectedInvoice.clientData}
          onClose={() => setShowInvoicePreview(false)} 
        />
      )}
    </div>
  );
};

export default Invoices;
