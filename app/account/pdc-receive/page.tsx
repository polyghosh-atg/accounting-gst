import { PdcList } from '@/app/account/pdc/list';

export default function PdcReceive({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return <PdcList kind="receive" title="PDC Receive" sub="Post-dated cheques from customers" searchParams={searchParams} />;
}
