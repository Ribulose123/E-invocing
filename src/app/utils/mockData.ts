import type { ReceivedInvoice } from "../type";

export const getMockReceivedInvoices = async (): Promise<ReceivedInvoice[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return [
    {
      id: '101',
      invoiceNumber: 'RCV-2024-001',
      irn: 'IRN-2024-101',
      date: '2024-01-18',
      dueDate: '2024-02-18',
      recipientName: 'Cloud Services Pro',
      recipientTin: '111222333',
      amount: 2500.00,
      currency: 'USD',
      status: 'paid',
      items: [
        {
          description: 'Cloud Hosting - January',
          quantity: 1,
          unitPrice: 2500.00,
          total: 2500.00,
        },
      ],
      statusHistory: [
        { step: 'Created', status: 'success', timestamp: '2024-01-18T08:30:10' },
        { step: 'Generated IRN', status: 'success', timestamp: '2024-01-18T08:30:10' },
        { step: 'Validated IRN', status: 'success', timestamp: '2024-01-18T08:30:10' },
        { step: 'Signed IRN', status: 'success', timestamp: '2024-01-18T08:30:10' },
        { step: 'Validated Invoice', status: 'success', timestamp: '2024-01-18T08:30:10' },
        { step: 'Signed Invoice', status: 'success', timestamp: '2024-01-18T08:30:11' },
        { step: 'Transmitted Invoice', status: 'success', timestamp: '2024-01-18T08:30:11' },
        { step: 'Confirmed Invoice', status: 'success', timestamp: '2024-01-18T08:30:12' },
      ],
    },
    {
      id: '102',
      invoiceNumber: 'RCV-2024-002',
      irn: 'IRN-2024-102',
      date: '2024-01-22',
      dueDate: '2024-02-22',
      recipientName: 'Office Supplies Co',
      recipientTin: '444555666',
      amount: 850.00,
      currency: 'USD',
      status: 'pending',
      items: [
        {
          description: 'Office Equipment',
          quantity: 10,
          unitPrice: 85.00,
          total: 850.00,
        },
      ],
      statusHistory: [
        { step: 'Created', status: 'success', timestamp: '2024-01-22T13:15:40' },
        { step: 'Generated IRN', status: 'success', timestamp: '2024-01-22T13:15:40' },
        { step: 'Validated IRN', status: 'success', timestamp: '2024-01-22T13:15:40' },
        { step: 'Signed IRN', status: 'success', timestamp: '2024-01-22T13:15:40' },
        { step: 'Validated Invoice', status: 'success', timestamp: '2024-01-22T13:15:40' },
        { step: 'Signed Invoice', status: 'success', timestamp: '2024-01-22T13:15:41' },
        { step: 'Transmitted Invoice', status: 'success', timestamp: '2024-01-22T13:15:41' },
        { step: 'Confirmed Invoice', status: 'pending' },
      ],
    },
    {
      id: '103',
      invoiceNumber: 'RCV-2024-003',
      irn: 'IRN-2024-103',
      date: '2024-01-05',
      dueDate: '2024-02-05',
      recipientName: 'Marketing Agency Plus',
      recipientTin: '777888999',
      amount: 6500.00,
      currency: 'USD',
      status: 'overdue',
      items: [
        {
          description: 'Digital Marketing Campaign',
          quantity: 1,
          unitPrice: 6500.00,
          total: 6500.00,
        },
      ],
      statusHistory: [
        { step: 'Created', status: 'success', timestamp: '2024-01-05T11:52:30' },
        { step: 'Generated IRN', status: 'success', timestamp: '2024-01-05T11:52:30' },
        { step: 'Validated IRN', status: 'success', timestamp: '2024-01-05T11:52:30' },
        { step: 'Signed IRN', status: 'success', timestamp: '2024-01-05T11:52:30' },
        { step: 'Validated Invoice', status: 'success', timestamp: '2024-01-05T11:52:30' },
        { step: 'Signed Invoice', status: 'success', timestamp: '2024-01-05T11:52:31' },
        { step: 'Transmitted Invoice', status: 'failed', timestamp: '2024-01-05T11:52:31', message: 'Recipient server unavailable' },
        { step: 'Confirmed Invoice', status: 'pending' },
      ],
    },
    {
      id: '104',
      invoiceNumber: 'RCV-2024-004',
      irn: 'IRN-2024-104',
      date: '2024-01-30',
      dueDate: '2024-02-28',
      recipientName: 'Legal Services LLC',
      recipientTin: '222333444',
      amount: 3200.00,
      currency: 'USD',
      status: 'pending',
      items: [
        {
          description: 'Legal Consultation',
          quantity: 8,
          unitPrice: 400.00,
          total: 3200.00,
        },
      ],
      statusHistory: [
        { step: 'Created', status: 'success', timestamp: '2024-01-30T15:40:55' },
        { step: 'Generated IRN', status: 'success', timestamp: '2024-01-30T15:40:55' },
        { step: 'Validated IRN', status: 'success', timestamp: '2024-01-30T15:40:55' },
        { step: 'Signed IRN', status: 'success', timestamp: '2024-01-30T15:40:55' },
        { step: 'Validated Invoice', status: 'success', timestamp: '2024-01-30T15:40:55' },
        { step: 'Signed Invoice', status: 'success', timestamp: '2024-01-30T15:40:56' },
        { step: 'Transmitted Invoice', status: 'success', timestamp: '2024-01-30T15:40:56' },
        { step: 'Confirmed Invoice', status: 'pending' },
      ],
    },
  ];
};

