'use client';

import { useState } from 'react';
import { Btn, Icon, fieldCls } from '@/components/ui';
import { saveCompany } from '../actions';

export type Geo = { id: number; name: string; code?: string };
export type Prefix = { doc_type: string; label: string; prefix: string; date_format: string; sequence: string };

const TABS: { key: string; icon: string }[] = [
  { key: 'Details', icon: 'users' },
  { key: 'GST', icon: 'doc' },
  { key: 'Bank Details', icon: 'bank' },
  { key: 'Terms & Condition', icon: 'report' },
  { key: 'Logo & Favicon', icon: 'eye' },
  { key: 'Signature', icon: 'edit' },
  { key: 'Currency', icon: 'sales' },
  { key: 'Prefix', icon: 'key' },
  { key: 'Invoice Setting', icon: 'transfer' },
  { key: 'Whatsapp Setting', icon: 'box' },
  { key: 'UPI', icon: 'dashboard' },
];

const FORMATS = ['Y-m', 'm-Y', 'Y-m-d', 'd-m-Y', 'Ym', 'mY', 'Ymd', 'dmY'];

const TAB_SUB: Record<string, string> = {
  Details: 'Identity, contact & address printed on every bill',
  GST: 'Registration status & GSTIN for tax invoices',
  'Bank Details': 'Bank account block shown on invoices',
  'Terms & Condition': 'Footer terms for sale & purchase documents',
  'Logo & Favicon': 'Brand images for documents & browser tab',
  Signature: 'Authorised signature stamp for invoices',
  Currency: 'Default billing currency',
  Prefix: 'Number series for every document type',
  'Invoice Setting': 'Payment due windows for sale & purchase',
  'Whatsapp Setting': 'Cloud API credentials for WhatsApp messages',
  UPI: 'QR collection settings for invoices',
};

function Row({ label, req, hint, children }: {
  label: string; req?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="grid items-start gap-1.5 rounded-xl px-3 py-2.5 transition hover:bg-slate-50 sm:grid-cols-[190px_1fr] sm:gap-3">
      <label className="pt-2 text-[13px] font-bold text-slate-600">
        {label} {req && <span className="text-rose-500">*</span>}
      </label>
      <div className="max-w-xl">
        {children}
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

function Seg({ name, options, value }: { name: string; options: [string, string][]; value: string }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1">
      {options.map(([v, label]) => (
        <label key={v}
          className={`cursor-pointer rounded-lg px-4 py-1.5 text-sm font-semibold transition has-checked:bg-white has-checked:text-indigo-700 has-checked:shadow ${value === v ? 'bg-white text-indigo-700 shadow' : 'text-slate-500'}`}>
          <input type="radio" name={name} value={v} defaultChecked={value === v} className="sr-only" />
          {label}
        </label>
      ))}
    </div>
  );
}

export default function CompanyTabs({ co, countries, states, cities, currencies, prefixes }: {
  co: Record<string, string>;
  countries: Geo[]; states: Geo[]; cities: Geo[];
  currencies: { id: number; name: string; symbol: string }[];
  prefixes: Prefix[];
}) {
  const [tab, setTab] = useState('Details');
  const days = Array.from({ length: 180 }, (_, i) => i + 1);
  const initials = String(co.name || 'O').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <form action={saveCompany} encType="multipart/form-data" className="space-y-3">
      {/* banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 p-4 text-white shadow-md sm:p-5">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-24 h-44 w-44 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3.5">
          {co.logo ? (
            <img src={co.logo} alt="logo" className="h-14 w-14 rounded-2xl bg-white object-contain p-1 shadow" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-xl font-extrabold ring-1 ring-inset ring-white/30">
              {initials}
            </span>
          )}
          <div className="min-w-0">
            <div className="truncate text-lg font-extrabold tracking-tight">{co.name || 'Your Company'}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-indigo-100">
              {co.email && <span>{co.email}</span>}
              {co.phone && <span>{co.phone}</span>}
              {co.gstin && (
                <span className="rounded-full bg-white/15 px-2 py-0.5 font-mono font-bold ring-1 ring-inset ring-white/25">
                  {co.gstin}
                </span>
              )}
            </div>
          </div>
          <div className="ml-auto hidden shrink-0 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-bold ring-1 ring-inset ring-white/25 sm:block">
            {cities.find((c) => String(c.id) === String(co.city_id))?.name || co.city || ''}
            {co.city_id || co.city ? ' · ' : ''}{states.find((s) => String(s.id) === String(co.state_id))?.name || co.state || ''}
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="slim-scroll sticky top-2 z-10 flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-sm backdrop-blur">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-[13px] font-bold transition ${tab === t.key
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
            <Icon name={t.icon} className="h-4 w-4 opacity-90" />
            {t.key}
          </button>
        ))}
      </div>

      {/* content */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 px-4 pb-2.5 pt-3.5 sm:px-5">
          <h3 className="font-extrabold text-slate-900">{tab}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{TAB_SUB[tab]}</p>
        </div>
        <div className="divide-y divide-slate-100 px-2 py-2 sm:px-3">
          {tab === 'Details' && (
            <>
              <Row label="Company Name" req><input name="company_name" required defaultValue={co.name || ''} placeholder="Company Name" className={fieldCls} /></Row>
              <Row label="Gem Seller Id"><input name="gem_seller_id" defaultValue={co.gem_seller_id || ''} placeholder="Gem Seller Id" className={fieldCls} /></Row>
              <Row label="Email" req hint="Please enter multiple email addresses separated by commas (,)">
                <input name="email" required defaultValue={co.email || ''} placeholder="Email" className={fieldCls} />
              </Row>
              <Row label="Phone" req><input name="mobile" required defaultValue={co.phone || ''} placeholder="Phone" className={fieldCls} /></Row>
              <Row label="Country" req>
                <select name="country_id" required defaultValue={co.country_id || '101'} className={fieldCls}>
                  {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Row>
              <Row label="State" req>
                <select name="state_id" required defaultValue={co.state_id || '14'} className={fieldCls}>
                  {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Row>
              <Row label="City" req>
                <select name="city_id" required defaultValue={co.city_id || '1222'} className={fieldCls}>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Row>
              <Row label="Address Line1"><input name="address_line1" defaultValue={co.addr1 || ''} placeholder="Address Line1" className={fieldCls} /></Row>
              <Row label="Address Line2"><input name="address_line2" defaultValue={co.addr2 || ''} placeholder="Address Line2" className={fieldCls} /></Row>
              <Row label="Pincode" req><input name="pincode" required defaultValue={co.pincode || ''} placeholder="Pincode" className={fieldCls} /></Row>
              <div className="grid items-start gap-1.5 rounded-xl px-3 py-2.5 sm:grid-cols-[190px_1fr_1fr] sm:gap-3">
                <label className="pt-2 text-[13px] font-bold text-slate-600">Whatsapp No</label>
                <select name="whatsapp_country_code" defaultValue={co.whatsapp_country_code || '244'} className={fieldCls}>
                  {countries.filter((c) => c.code).map((c) => <option key={c.id} value={c.code}>{c.name} - {c.code}</option>)}
                </select>
                <input name="whatsapp_no" defaultValue={co.whatsapp_no || ''} placeholder="Whatsapp No" className={fieldCls} />
              </div>
            </>
          )}

          {tab === 'GST' && (
            <>
              <Row label="GST Registration Type" req>
                <select name="gst_registration_type" required defaultValue={co.gst_registration_type || '1'} className={fieldCls}>
                  <option value="1">Registered</option>
                  <option value="0">Not Registered</option>
                  <option value="2">Composite</option>
                </select>
              </Row>
              <Row label="GSTIN"><input name="gstin" defaultValue={co.gstin || ''} placeholder="GSTIN (Example : 22AAAAA0000A1Z5)" className={fieldCls} /></Row>
            </>
          )}

          {tab === 'Bank Details' && (
            <Row label="Bank Detail">
              <textarea name="bank_detail" rows={5} defaultValue={co.bank_detail || ''} placeholder="Bank Detail" className={fieldCls} />
            </Row>
          )}

          {tab === 'Terms & Condition' && (
            <Row label="Terms & Condition">
              <textarea name="terms_and_condition" rows={5} defaultValue={co.terms_and_condition || ''} placeholder="Terms & Condition" className={fieldCls} />
            </Row>
          )}

          {tab === 'Logo & Favicon' && (
            <>
              <Row label="Logo">
                <div className="flex items-center gap-3">
                  {co.logo && <img src={co.logo} alt="logo" className="h-14 w-14 rounded-xl border border-slate-200 bg-slate-50 object-contain p-1" />}
                  <input type="file" name="logo" accept="image/*" className={`${fieldCls} file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-indigo-700`} />
                </div>
              </Row>
              <Row label="Favicon">
                <div className="flex items-center gap-3">
                  {co.favicon && <img src={co.favicon} alt="favicon" className="h-10 w-10 rounded-xl border border-slate-200 bg-slate-50 object-contain p-1" />}
                  <input type="file" name="favicon" accept="image/*" className={`${fieldCls} file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-indigo-700`} />
                </div>
              </Row>
            </>
          )}

          {tab === 'Signature' && (
            <Row label="Signature">
              <div className="flex items-center gap-3">
                {co.signature && <img src={co.signature} alt="signature" className="h-14 rounded-xl border border-slate-200 bg-slate-50 object-contain p-1" />}
                <input type="file" name="signature" accept="image/*" className={`${fieldCls} file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-indigo-700`} />
              </div>
            </Row>
          )}

          {tab === 'Currency' && (
            <Row label="Default Currency" req>
              <select name="currency_id" required defaultValue={co.currency_id || ''} className={fieldCls}>
                <option value="">Default Currency</option>
                {currencies.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>)}
              </select>
            </Row>
          )}

          {tab === 'Prefix' && (
            <>
              <Row label="Seperator">
                <select name="seperator" defaultValue={co.separator ?? ''} className={fieldCls}>
                  <option value="_">_ (Underscore)</option>
                  <option value="-">- (Dash)</option>
                  <option value="">(No Seperator)</option>
                </select>
              </Row>
              <div className="slim-scroll overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="sticky top-0 bg-indigo-50/80 backdrop-blur">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-indigo-900">Document</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-indigo-900">Prefix</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-indigo-900">Date Format</th>
                      <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-indigo-900">Sequence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {prefixes.map((p, i) => (
                      <tr key={p.doc_type} className={i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                        <td className="whitespace-nowrap px-3 py-1.5 font-bold text-slate-700">
                          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-[11px] font-extrabold text-indigo-700">{p.label[0]}</span>
                          {p.label}
                        </td>
                        <td className="px-3 py-1.5"><input name={`${p.doc_type}_prefix`} defaultValue={p.prefix} className={fieldCls} /></td>
                        <td className="px-3 py-1.5">
                          <select name={`${p.doc_type}_date_format`} defaultValue={p.date_format} className={fieldCls}>
                            {FORMATS.map((f) => <option key={f}>{f}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-1.5"><input name={`${p.doc_type}_sequence`} defaultValue={p.sequence} className={fieldCls} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'Invoice Setting' && (
            <>
              <Row label="Payment Duration for Sale" req>
                <select name="payment_duration_for_sale" required defaultValue={co.payment_duration_for_sale || '4'} className={fieldCls}>
                  {days.map((d) => <option key={d} value={d}>{d} days</option>)}
                </select>
              </Row>
              <Row label="Payment Duration for Purchase" req>
                <select name="payment_duration_for_purchase" required defaultValue={co.payment_duration_for_purchase || '30'} className={fieldCls}>
                  {days.map((d) => <option key={d} value={d}>{d} days</option>)}
                </select>
              </Row>
            </>
          )}

          {tab === 'Whatsapp Setting' && (
            <>
              <Row label="Instance ID"><input name="instance_id" defaultValue={co.instance_id || ''} placeholder="Instance ID" className={`${fieldCls} font-mono`} /></Row>
              <Row label="Access Token"><input name="access_token" defaultValue={co.access_token || ''} placeholder="Access token" className={`${fieldCls} font-mono`} /></Row>
            </>
          )}

          {tab === 'UPI' && (
            <>
              <Row label="UPI status">
                <Seg name="upi_status" value={co.upi_status || 'yes'} options={[['no', 'No'], ['yes', 'Yes']]} />
              </Row>
              <Row label="UPI"><input name="upi_address" defaultValue={co.upi_address || ''} placeholder="you@upi" className={`${fieldCls} font-mono`} /></Row>
              <Row label="Qr type">
                <Seg name="qr_type" value={co.qr_type || 'company_based'} options={[['company_based', 'Company based'], ['invoice_based', 'Invoice based']]} />
              </Row>
              <Row label="Show QR Code in Proforma Invoice">
                <Seg name="show_qr_code_in_proforma" value={co.show_qr_code_in_proforma || 'yes'} options={[['no', 'No'], ['yes', 'Yes']]} />
              </Row>
            </>
          )}
        </div>

        <div className="sticky bottom-3 flex items-center gap-3 border-t border-slate-100 bg-white/95 px-4 py-2.5 backdrop-blur sm:px-5">
          <span className="text-xs text-slate-400">Changes apply to new invoices & documents</span>
          <Btn type="submit" className="ml-auto bg-gradient-to-r from-indigo-600 to-violet-600 px-8 shadow-lg hover:opacity-95">✓ Save</Btn>
        </div>
      </div>
    </form>
  );
}
