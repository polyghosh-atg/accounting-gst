/* Shared whatsapp template type metadata (server + client safe — no 'use client'). */

export const WTPL_TYPES: { key: string; label: string; keys: string[] }[] = [
  {
    key: 'sale_confirmation', label: 'Sale Confirmation',
    keys: ['customer_name', 'invoice_no', 'invoice_date', 'invoice_amount', 'company_name'],
  },
  {
    key: 'payment_confirmation', label: 'Payment Confirmation',
    keys: ['payment_date', 'amount_received', 'pending_amount', 'invoice_no', 'company_name', 'invoice_date', 'invoice_amount', 'customer_name'],
  },
  {
    key: 'salary_payslip', label: 'Salary Payslip',
    keys: ['employee_name', 'employee_code', 'month_year', 'department', 'position', 'company_name', 'basic_salary', 'earnings', 'deduction', 'net_salary'],
  },
  {
    key: 'payment_reminder', label: 'Payment Reminder',
    keys: ['customer_name', 'invoice_no', 'invoice_date', 'pending_amount', 'company_name'],
  },
];

export const wtplLabel = (v: string) =>
  WTPL_TYPES.find((t) => t.key === v)?.label ?? v;
