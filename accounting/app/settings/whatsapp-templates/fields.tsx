'use client';

import { useRef, useState } from 'react';
import { fieldCls } from '@/components/ui';

/* Mirrors https://vaksys.com/pro/whatsapp_template add/edit modal.
   Placeholders are inserted as {{key}} (click chip) or copied (copy icon). */
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

export function WtplFields({ current, message, used }: { current?: string; message?: string; used: string[] }) {
  const [type, setType] = useState(current || '');
  const [copied, setCopied] = useState(false);
  const msgRef = useRef<HTMLTextAreaElement>(null);
  const keys = WTPL_TYPES.find((t) => t.key === type)?.keys ?? [];
  const custom = current && !WTPL_TYPES.some((t) => t.key === current) ? current : null;

  const insertAtCursor = (k: string) => {
    const el = msgRef.current;
    if (!el) return;
    const tag = `{{${k}}}`;
    const s = el.selectionStart ?? el.value.length;
    const e = el.selectionEnd ?? el.value.length;
    el.value = el.value.slice(0, s) + tag + el.value.slice(e);
    el.focus();
    el.selectionStart = el.selectionEnd = s + tag.length;
  };

  const copyKey = async (k: string) => {
    try {
      await navigator.clipboard.writeText(`{{${k}}}`);
    } catch {
      /* clipboard unavailable — chip click still inserts */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <>
      <label className="mb-1 block text-sm font-semibold text-slate-700">
        Type <span className="text-rose-500">*</span>
      </label>
      <select name="wm_type" required value={type} onChange={(e) => setType(e.target.value)} className={fieldCls}>
        <option value="">Select</option>
        {custom && <option value={custom}>{custom}</option>}
        {WTPL_TYPES.map((t) => (
          <option key={t.key} value={t.key} disabled={used.includes(t.key) && t.key !== current}>
            {t.label}
          </option>
        ))}
      </select>
      {keys.length > 0 && (
        <div className="relative flex flex-wrap items-center gap-x-1 gap-y-1 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-2.5 py-2 text-[13px]">
          {copied && (
            <span className="absolute right-1 top-1 rounded-md bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
              Copied!
            </span>
          )}
          {keys.map((k, i) => (
            <span key={`${k}-${i}`} className="inline-flex items-center">
              <button
                type="button"
                title="Copy"
                onClick={() => copyKey(k)}
                className="mr-0.5 font-bold text-slate-400 hover:text-indigo-600"
              >
                ⧉
              </button>
              <button
                type="button"
                title="Insert into message"
                onClick={() => insertAtCursor(k)}
                className="cursor-pointer font-mono text-indigo-700 hover:underline"
              >
                {`{{${k}}}`}
              </button>
              {i < keys.length - 1 && <span className="text-slate-400">,</span>}
            </span>
          ))}
        </div>
      )}
      <label className="mb-1 block text-sm font-semibold text-slate-700">
        Message <span className="text-rose-500">*</span>
      </label>
      <textarea
        ref={msgRef}
        name="wm_message"
        required
        rows={12}
        placeholder="Message"
        defaultValue={message || ''}
        className={`${fieldCls} font-mono`}
      />
    </>
  );
}
