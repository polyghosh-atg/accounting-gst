import { PdcList } from '@/app/account/pdc/list';

export default function PdcPayment({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return <PdcList kind="payment" title="PDC Payment" sub="Post-dated cheques to suppliers" searchParams={searchParams} />;
}
