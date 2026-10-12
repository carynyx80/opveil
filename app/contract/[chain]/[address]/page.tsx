import { notFound } from "next/navigation";
import { isAddress } from "viem";
import { ReportShell } from "@/components/report-shell";
import { parseChainKey } from "@/lib/chains";

interface Props {
  params: { chain: string; address: string };
}

export async function generateMetadata({ params }: Props) {
  return { title: `${params.address.slice(0, 10)}… on ${params.chain} — Opveil` };
}

export default function ContractReportPage({ params }: Props) {
  const chain = parseChainKey(params.chain);
  if (!chain) notFound();
  if (!isAddress(params.address, { strict: false })) notFound();
  return <ReportShell chain={chain} address={params.address} />;
}
