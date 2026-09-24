import type { Metadata } from "next";
import { ProgressClient } from "@/components/ProgressClient";

export const metadata: Metadata = { title: "Progression" };

export default function ProgressPage() {
  return <ProgressClient />;
}
