import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import Sidebar from '@/components/sidebar';
import Topbar from '@/components/topbar';
import { q, inr } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getFinancialYears } from '@/lib/fy';

export const metadata: Metadata = {
  title: 'Office ERP',
  description: 'Office ERP — accounting with GST',
};

// Reads the session cookie — must block on the server, no static shell.
export const instant = false;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    );
  }
  const fyYears = await getFinancialYears();
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen lg:flex">
          <Sidebar user={{ username: user.username, role: user.role }} fyYears={fyYears} />
          <div className="min-w-0 flex-1">
            <Suspense fallback={<Topbar cash="…" accounts={[]} />}>
              <TopbarLoader />
            </Suspense>
            <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

async function TopbarLoader() {
  const [acc, cash] = await Promise.all([
    q('SELECT id, name, bank_name, closing FROM bank_accounts ORDER BY closing DESC'),
    q<{ t: string }>(`SELECT COALESCE(SUM(CASE WHEN lower(name)='cash' THEN closing ELSE 0 END),0) t FROM bank_accounts`),
  ]);
  return (
    <Topbar
      cash={inr(cash[0]?.t)}
      accounts={acc.map((a) => ({ id: Number(a.id), name: String(a.name), bank_name: String(a.bank_name), closing: inr(a.closing) }))}
    />
  );
}
