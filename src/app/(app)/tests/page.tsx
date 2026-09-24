import type { Metadata } from "next";
import { StrengthTestsScreen } from "@/components/StrengthTestsScreen";
import { trainingSeed } from "@/lib/training-data";

export const metadata: Metadata = { title: "Tests de force" };

export default async function TestsPage({ searchParams }: { searchParams: Promise<{ test?: string }> }) {
  const query = await searchParams;
  return <StrengthTestsScreen tests={trainingSeed.strength_tests} initialSlug={query.test} />;
}
