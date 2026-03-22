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
import { Plus, FileText, Trash2, Download, Printer, Send, X, Calendar, User, Building2, Receipt, CreditCard, Clock, FileCheck, AlertCircle } from 'lucide-react';
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
  { code: '05', name: 'Assistive Technology' },
  { code: '06', name: 'Home Modifications' },
  { code: '07', name: 'Coordination of Supports' },
  { code: '08', name: 'Improved Living Arrangements' },
  { code: '09', name: 'Increased Social & Community Participation' },
  { code: '10', name: 'Finding & Keeping a Job' },
  { code: '11', name: 'Improved Relationships' },
  { code: '12', name: 'Improved Health & Wellbeing' },
  { code: '13', name: 'Improved Learning' },
  { code: '14', name: 'Improved Life Choices' },
  { code: '15', name: 'Improved Daily Living Skills' },
];

// Payment Terms Options
const PAYMENT_TERMS = [
  { value: '7', label: 'Net 7 Days' },
  { value: '14', label: 'Net 14 Days' },
  { value: '30', label: 'Net 30 Days' },
  { value: '60', label: 'Net 60 Days' },
  { value: 'due_on_receipt', label: 'Due on Receipt' },
];

// Professional Invoice Template Component
const InvoiceTemplate = ({ invoice, client, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
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
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Invoice Date</p>
                <p className="text-slate-900 font-medium">{invoice.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Due Date</p>
                <p className="text-slate-900 font-medium">{invoice.due_date || 'On Receipt'}</p>
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

// Enhanced Create Invoice Form Component
const CreateInvoiceForm = ({ clients, onSubmit, onCancel }) => {
  const [step, setStep] = useState(1);
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
    internal_notes: '',
    line_items: [{ 
      description: '', 
      support_item_number: '',
      quantity: 1, 
      rate: 0, 
      amount: 0,
      date_of_service: ''
    }],
  });

  const selectedClient = clients.find(c => c.id === formData.client_id);
  const subtotal = formData.line_items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const gst = 0; // NDIS services are GST-free
  const total = subtotal + gst;

  const addLineItem = () => {
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { 
        description: '', 
        support_item_number: '',
        quantity: 1, 
        rate: 0, 
        amount: 0,
        date_of_service: ''
      }],
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
      const items = formData.line_items.filter((_, i) => i !== index);
      setFormData({ ...formData, line_items: items });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isStep1Valid = formData.client_id && formData.service_period_start && formData.service_period_end;
  const isStep2Valid = formData.line_items.every(item => item.description && item.quantity > 0 && item.rate > 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* Header with Logo and Title */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 -mx-6 -mt-6 mb-6 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create New Invoice</h2>
              <p className="text-emerald-100 text-sm">NDIS Compliant Invoice Generation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  step === s
                    ? 'bg-white text-emerald-600'
                    : step > s
                    ? 'bg-emerald-400 text-white'
                    : 'bg-emerald-500/50 text-emerald-200'
                }`}
              >
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { num: 1, label: 'Client & Period', icon: User },
          { num: 2, label: 'Services', icon: FileCheck },
          { num: 3, label: 'Review & Create', icon: CreditCard },
        ].map(({ num, label, icon: Icon }) => (
          <button
            key={num}
            type="button"
            onClick={() => (num < step || (num === 2 && isStep1Valid) || (num === 3 && isStep1Valid && isStep2Valid)) && setStep(num)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              step === num
                ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                : step > num
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-slate-50 text-slate-400 border border-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Step 1: Client & Service Period */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Client Selection */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-slate-800">Participant Details</h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="client_id" className="text-slate-700 font-medium">Select Participant *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
                  <SelectTrigger className="mt-1.5 bg-white border-slate-300" data-testid="invoice-client-select">
                    <SelectValue placeholder="Choose a participant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{client.full_name}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-500 text-sm">{client.ndis_number}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClient && (
                <div className="bg-white rounded-lg p-4 border border-emerald-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Full Name</p>
                      <p className="font-medium text-slate-800">{selectedClient.full_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">NDIS Number</p>
                      <p className="font-medium text-slate-800">{selectedClient.ndis_number}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Email</p>
                      <p className="font-medium text-slate-800">{selectedClient.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Phone</p>
                      <p className="font-medium text-slate-800">{selectedClient.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Service Period */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-slate-800">Service Period & Payment</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="service_period_start" className="text-slate-700 font-medium">Period Start *</Label>
                <Input
                  id="service_period_start"
                  type="date"
                  data-testid="invoice-start-input"
                  value={formData.service_period_start}
                  onChange={(e) => setFormData({ ...formData, service_period_start: e.target.value })}
                  className="mt-1.5 bg-white border-slate-300"
                  required
                />
              </div>
              <div>
                <Label htmlFor="service_period_end" className="text-slate-700 font-medium">Period End *</Label>
                <Input
                  id="service_period_end"
                  type="date"
                  data-testid="invoice-end-input"
                  value={formData.service_period_end}
                  onChange={(e) => setFormData({ ...formData, service_period_end: e.target.value })}
                  className="mt-1.5 bg-white border-slate-300"
                  required
                />
              </div>
              <div>
                <Label htmlFor="due_date" className="text-slate-700 font-medium">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="mt-1.5 bg-white border-slate-300"
                />
              </div>
              <div>
                <Label htmlFor="payment_terms" className="text-slate-700 font-medium">Payment Terms</Label>
                <Select
                  value={formData.payment_terms}
                  onValueChange={(value) => setFormData({ ...formData, payment_terms: value })}
                >
                  <SelectTrigger className="mt-1.5 bg-white border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS.map((term) => (
                      <SelectItem key={term.value} value={term.value}>{term.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* NDIS Details */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-slate-800">NDIS Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ndis_category" className="text-slate-700 font-medium">Support Category</Label>
                <Select
                  value={formData.ndis_category}
                  onValueChange={(value) => setFormData({ ...formData, ndis_category: value })}
                >
                  <SelectTrigger className="mt-1.5 bg-white border-slate-300">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {NDIS_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.code} value={cat.code}>
                        <span className="font-mono text-emerald-600 mr-2">{cat.code}</span>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="claim_type" className="text-slate-700 font-medium">Claim Type</Label>
                <Select
                  value={formData.claim_type}
                  onValueChange={(value) => setFormData({ ...formData, claim_type: value })}
                >
                  <SelectTrigger className="mt-1.5 bg-white border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Claim</SelectItem>
                    <SelectItem value="cancellation">Cancellation</SelectItem>
                    <SelectItem value="travel">Travel Claim</SelectItem>
                    <SelectItem value="ndia_managed">NDIA Managed</SelectItem>
                    <SelectItem value="plan_managed">Plan Managed</SelectItem>
                    <SelectItem value="self_managed">Self Managed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="reference_number" className="text-slate-700 font-medium">Reference / PO Number</Label>
                <Input
                  id="reference_number"
                  placeholder="Enter reference number (optional)"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  className="mt-1.5 bg-white border-slate-300"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="button"
              onClick={() => setStep(2)}
              disabled={!isStep1Valid}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Continue to Services
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Line Items */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-800">Service Items</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                data-testid="add-line-item-button"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Service
              </Button>
            </div>

            <div className="space-y-4">
              {formData.line_items.map((item, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-slate-200 relative">
                  <div className="absolute -top-3 left-4 bg-emerald-600 text-white text-xs font-semibold px-2 py-0.5 rounded">
                    Item {index + 1}
                  </div>
                  {formData.line_items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  
                  <div className="grid grid-cols-12 gap-3 mt-2">
                    <div className="col-span-6">
                      <Label className="text-xs text-slate-600 font-medium">Service Description *</Label>
                      <Input
                        placeholder="e.g., Personal Care - Morning Routine"
                        data-testid={`line-item-description-${index}`}
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        className="mt-1 border-slate-300"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs text-slate-600 font-medium">Support Item #</Label>
                      <Input
                        placeholder="e.g., 01_011_0107_1_1"
                        value={item.support_item_number}
                        onChange={(e) => updateLineItem(index, 'support_item_number', e.target.value)}
                        className="mt-1 border-slate-300 font-mono text-sm"
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs text-slate-600 font-medium">Date of Service</Label>
                      <Input
                        type="date"
                        value={item.date_of_service}
                        onChange={(e) => updateLineItem(index, 'date_of_service', e.target.value)}
                        className="mt-1 border-slate-300"
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs text-slate-600 font-medium">Hours/Units *</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0.5"
                        data-testid={`line-item-quantity-${index}`}
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="mt-1 border-slate-300"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs text-slate-600 font-medium">Rate ($/hr) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        data-testid={`line-item-rate-${index}`}
                        value={item.rate}
                        onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        className="mt-1 border-slate-300"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs text-slate-600 font-medium">Amount</Label>
                      <div className="mt-1 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 font-semibold text-emerald-700">
                        ${(item.amount || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Running Total */}
            <div className="mt-6 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg p-4 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-emerald-100 text-sm">{formData.line_items.length} service item(s)</p>
                  <p className="text-lg font-semibold">Running Total</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">${total.toFixed(2)}</p>
                  <p className="text-emerald-100 text-sm">GST Free</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              type="button"
              onClick={() => setStep(3)}
              disabled={!isStep2Valid}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Continue to Review
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Notes */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl p-6 text-white">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-slate-400 text-sm uppercase tracking-wider">Invoice Preview</p>
                <p className="text-2xl font-bold mt-1">{selectedClient?.full_name}</p>
                <p className="text-slate-400">NDIS: {selectedClient?.ndis_number}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm">Total Amount</p>
                <p className="text-4xl font-bold text-emerald-400">${total.toFixed(2)}</p>
              </div>
            </div>
            
            <Separator className="bg-slate-700 my-4" />
            
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Service Period</p>
                <p className="font-medium">{formData.service_period_start} to {formData.service_period_end}</p>
              </div>
              <div>
                <p className="text-slate-400">Due Date</p>
                <p className="font-medium">{formData.due_date || 'On Receipt'}</p>
              </div>
              <div>
                <p className="text-slate-400">Claim Type</p>
                <p className="font-medium capitalize">{formData.claim_type.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-slate-400">Items</p>
                <p className="font-medium">{formData.line_items.length} service(s)</p>
              </div>
            </div>
          </div>

          {/* Line Items Summary */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4">Services Summary</h3>
            <div className="space-y-2">
              {formData.line_items.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-slate-200 last:border-0">
                  <div>
                    <p className="font-medium text-slate-800">{item.description || 'Unnamed Service'}</p>
                    <p className="text-sm text-slate-500">
                      {item.quantity} hrs × ${item.rate.toFixed(2)}/hr
                      {item.support_item_number && ` • ${item.support_item_number}`}
                    </p>
                  </div>
                  <p className="font-semibold text-emerald-600">${item.amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Notes Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-emerald-600" />
                <Label className="font-semibold text-slate-800">Invoice Notes</Label>
              </div>
              <Textarea
                placeholder="Notes to appear on the invoice (visible to participant)..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-white border-slate-300 min-h-[100px]"
              />
            </div>
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <Label className="font-semibold text-slate-800">Internal Notes</Label>
              </div>
              <Textarea
                placeholder="Internal notes (not visible on invoice)..."
                value={formData.internal_notes}
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                className="bg-white border-slate-300 min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 px-8"
                data-testid="invoice-submit-button"
              >
                <Receipt className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </div>
          </div>
        </div>
      )}
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700" data-testid="create-invoice-button">
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader className="sr-only">
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <CreateInvoiceForm
              clients={clients}
              onSubmit={handleSubmit}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: invoices.length, color: 'text-slate-900', bg: 'bg-slate-50' },
          { label: 'Paid', value: invoices.filter(i => i.status === 'paid').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending', value: invoices.filter(i => i.status === 'sent').length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Overdue', value: invoices.filter(i => i.status === 'overdue').length, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((stat, i) => (
          <Card key={i} className={`border-slate-200 ${stat.bg}`}>
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
