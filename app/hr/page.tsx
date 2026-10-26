import { Suspense } from 'react';
import { q } from '@/lib/db';
import { Table } from '@/components/table';
import { PageHeader, LoadingRows, Badge, Stat } from '@/components/ui';
export default function HR() {
  return (<div className="space-y-4">
    <PageHeader title="HR Module" sub="Employees, attendance, payroll & more" />
    <Suspense fallback={<LoadingRows />}><Content /></Suspense></div>);
}
async function Content() {
  const emp = await q('SELECT first_name, last_name, code, email, department, position, hire_date, salary FROM employees');
  const ev = await q(`SELECT kind, count(*) c, COALESCE(SUM(amount),0) t FROM hr_events GROUP BY kind ORDER BY kind`);
  const rec = await q('SELECT kind, employee, event_date, status, amount, extra FROM hr_events ORDER BY id DESC LIMIT 60');
  return (<>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Stat icon="hr" label="Employees" value={emp.length} tone="indigo" />
      <Stat icon="doc" label="Attendance" value={ev.find((e) => e.kind === 'attendance')?.c ?? 0} sub="records" tone="emerald" />
      <Stat icon="report" label="Payroll" value={ev.find((e) => e.kind === 'payroll')?.c ?? 0} sub="runs" tone="amber" />
      <Stat icon="users" label="Leave" value={ev.find((e) => e.kind === 'leave')?.c ?? 0} sub="applications" tone="rose" />
    </div>
    <h2 className="font-bold text-slate-900">Employees ({emp.length})</h2>
    <Table heads={['First', 'Last', 'Code', 'Email', 'Dept', 'Position', 'Hire', 'Salary']}
      align={['l', 'l', 'l', 'l', 'l', 'l', 'l', 'r']}
      rows={emp.map((r) => [<b key="n">{String(r.first_name)}</b>, String(r.last_name), String(r.code), String(r.email), String(r.department), String(r.position), r.hire_date ? String(r.hire_date).slice(0, 10) : '', String(r.salary)])} />
    <h2 className="pt-1 font-bold text-slate-900">Events by kind</h2>
    <Table heads={['Kind', 'Count', 'Amount']} align={['l', 'r', 'r']}
      rows={ev.map((r) => [<Badge key="k" tone="blue">{String(r.kind)}</Badge>, String(r.c), String(r.t)])} />
    <h2 className="pt-1 font-bold text-slate-900">Recent events (60)</h2>
    <Table heads={['Kind', 'Employee', 'Date', 'Status', 'Amount', 'Extra']}
      rows={rec.map((r) => [<Badge key="k" tone="blue">{String(r.kind)}</Badge>, String(r.employee), r.event_date ? String(r.event_date).slice(0, 10) : '', String(r.status), String(r.amount), <span key="e" className="max-w-56 truncate">{String(r.extra)}</span>])} />
  </>);
}
