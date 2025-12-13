'use client'
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Trash2, 
  FileSpreadsheet, 
  Edit2, 
  Save, 
  X,
  Search,
  Receipt
} from 'lucide-react';
import { INVOICE_FIELDS } from './utils/fieldMappingUtils';
import type { FieldMapping } from './FieldMappingDialog';
import type { Invoice } from '@/app/type';
import { API_END_POINT } from '@/app/config/Api';

interface ManageMappingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getSavedMappings: () => FieldMapping;
  clearMappings: () => void;
  invoices?: Invoice[];
  onInvoiceUpdate?: () => void;
}

interface EditableInvoice extends Invoice {
  isEditing?: boolean;
  editedFields?: Partial<Invoice>;
}

export function ManageMappingsDialog({
  open,
  onOpenChange,
  getSavedMappings,
  clearMappings,
  invoices = [],
  onInvoiceUpdate,
}: ManageMappingsDialogProps) {
  const [activeTab, setActiveTab] = useState<'mappings' | 'invoices'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editedInvoice, setEditedInvoice] = useState<Partial<Invoice>>({});
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const mappings = getSavedMappings();
  const mappingEntries = Object.entries(mappings);

  // Filter invoices based on search
  const filteredInvoices = invoices.filter((invoice) =>
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.irn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.current_status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoiceId(invoice.id);
    setEditedInvoice({
      invoice_number: invoice.invoice_number,
      irn: invoice.irn,
      platform: invoice.platform,
      current_status: invoice.current_status,
    });
  };

  const handleCancelEdit = () => {
    setEditingInvoiceId(null);
    setEditedInvoice({});
  };

  const handleSaveEdit = async (invoiceId: string) => {
    setIsSaving(true);
    try {
      const userData = localStorage.getItem('userData');
      const token = localStorage.getItem('authToken');
      
      if (!userData || !token) {
        alert('Please log in to edit invoices');
        return;
      }

      const user = JSON.parse(userData);
      
      // Update invoice via API
      const response = await fetch(
        API_END_POINT.INVOICE.UPDATE_INVOICE
          .replace('{business_id}', user.id)
          .replace('{invoice_id}', invoiceId),
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editedInvoice),
        }
      );

      if (response.ok) {
        setEditingInvoiceId(null);
        setEditedInvoice({});
        if (onInvoiceUpdate) {
          onInvoiceUpdate();
        }
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to update invoice');
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert('Error updating invoice. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (invoiceId: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(invoiceId);
    try {
      const userData = localStorage.getItem('userData');
      const token = localStorage.getItem('authToken');
      
      if (!userData || !token) {
        alert('Please log in to delete invoices');
        return;
      }

      const user = JSON.parse(userData);
      
      const response = await fetch(
        API_END_POINT.INVOICE.DELETE_INVOICE
          .replace('{business_id}', user.id)
          .replace('{invoice_id}', invoiceId),
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        if (onInvoiceUpdate) {
          onInvoiceUpdate();
        }
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to delete invoice');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Error deleting invoice. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const getFieldLabel = (value: string) => {
    return INVOICE_FIELDS.find((f) => f.value === value)?.label || value;
  };

  const handleClear = () => {
    if (
      window.confirm(
        'Are you sure you want to clear all saved field mappings? You will need to map fields again on your next upload.'
      )
    ) {
      clearMappings();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileSpreadsheet className="size-6 text-[#8B1538]" />
            Manage Mappings & Invoices
          </DialogTitle>
          <DialogDescription>
            View and manage your field mappings and uploaded invoices.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'invoices'
                ? 'border-b-2 border-[#8B1538] text-[#8B1538]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="size-4 inline mr-2" />
            Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('mappings')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'mappings'
                ? 'border-b-2 border-[#8B1538] text-[#8B1538]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="size-4 inline mr-2" />
            Field Mappings ({mappingEntries.length})
          </button>
        </div>

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            {invoices.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="size-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No invoices uploaded yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  Upload an Excel file to create your first invoice
                </p>
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search invoices by number, IRN, or status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Invoices Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs text-slate-600 uppercase">
                          Invoice Number
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-slate-600 uppercase">
                          IRN
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-slate-600 uppercase">
                          Platform
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-slate-600 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-slate-600 uppercase">
                          Created
                        </th>
                        <th className="px-4 py-3 text-center text-xs text-slate-600 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredInvoices.map((invoice) => (
                        <tr key={invoice.id} className="bg-white hover:bg-slate-50">
                          {editingInvoiceId === invoice.id ? (
                            <>
                              <td className="px-4 py-3">
                                <Input
                                  value={editedInvoice.invoice_number || ''}
                                  onChange={(e) =>
                                    setEditedInvoice({
                                      ...editedInvoice,
                                      invoice_number: e.target.value,
                                    })
                                  }
                                  className="h-8 text-sm"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  value={editedInvoice.irn || ''}
                                  onChange={(e) =>
                                    setEditedInvoice({
                                      ...editedInvoice,
                                      irn: e.target.value,
                                    })
                                  }
                                  className="h-8 text-sm"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  value={editedInvoice.platform || ''}
                                  onChange={(e) =>
                                    setEditedInvoice({
                                      ...editedInvoice,
                                      platform: e.target.value,
                                    })
                                  }
                                  className="h-8 text-sm"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  value={editedInvoice.current_status || ''}
                                  onChange={(e) =>
                                    setEditedInvoice({
                                      ...editedInvoice,
                                      current_status: e.target.value,
                                    })
                                  }
                                  className="h-8 text-sm"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-500">
                                {invoice.created_at
                                  ? new Date(invoice.created_at).toLocaleDateString()
                                  : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2 justify-center">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleSaveEdit(invoice.id)}
                                    disabled={isSaving}
                                    className="h-7"
                                  >
                                    <Save className="size-3 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                    disabled={isSaving}
                                    className="h-7"
                                  >
                                    <X className="size-3 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3">
                                <code className="text-sm bg-slate-100 px-2 py-1 rounded">
                                  {invoice.invoice_number}
                                </code>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {invoice.irn || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {invoice.platform || '-'}
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={getStatusColor(invoice.current_status || invoice.status_text || '')}>
                                  {invoice.current_status || invoice.status_text || 'Unknown'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-500">
                                {invoice.created_at
                                  ? new Date(invoice.created_at).toLocaleDateString()
                                  : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2 justify-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEdit(invoice)}
                                    className="h-7"
                                  >
                                    <Edit2 className="size-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDelete(invoice.id)}
                                    disabled={isDeleting === invoice.id}
                                    className="h-7"
                                  >
                                    <Trash2 className="size-3 mr-1" />
                                    {isDeleting === invoice.id ? 'Deleting...' : 'Delete'}
                                  </Button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredInvoices.length === 0 && searchTerm && (
                  <p className="text-center text-slate-500 py-4">
                    No invoices found matching &quot;{searchTerm}&quot;
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Mappings Tab */}
        {activeTab === 'mappings' && (
          <div className="space-y-4">
            {mappingEntries.length === 0 ? (
              <div className="text-center py-12">
                <FileSpreadsheet className="size-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No field mappings saved yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  Upload an Excel file to create your first mapping
                </p>
              </div>
            ) : (
              <>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs text-slate-600 uppercase">
                          Your Header
                        </th>
                        <th className="px-4 py-3 text-center text-xs text-slate-600 uppercase">
                          
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-slate-600 uppercase">
                          Invoice Field
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {mappingEntries.map(([userHeader, invoiceField]) => (
                        <tr key={userHeader} className="bg-white">
                          <td className="px-4 py-3">
                            <code className="text-sm bg-slate-100 px-2 py-1 rounded">
                              {userHeader}
                            </code>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-slate-400">→</span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className="bg-[#8B1538] text-white hover:bg-[#8B1538]">
                              {getFieldLabel(invoiceField)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <p className="text-sm text-slate-600">
                    {mappingEntries.length} {mappingEntries.length === 1 ? 'field' : 'fields'} mapped
                  </p>
                  <Button variant="destructive" size="sm" onClick={handleClear}>
                    <Trash2 className="size-4 mr-2" />
                    Clear All Mappings
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

