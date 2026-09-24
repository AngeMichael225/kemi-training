import type { Metadata } from "next";
import { TodayOverview } from "@/components/TodayOverview";
import { getAvailableWeek, getCalendarWeekNumber, trainingSeed } from "@/lib/training-data";

export const metadata: Metadata = { title: "Aujourd'hui" };
export const dynamic = "force-dynamic";

export default function TodayPage() {
  const requestedWeek = getCalendarWeekNumber();
  const week = getAvailableWeek(requestedWeek);
  const maxAvailableWeek = Math.max(...trainingSeed.program.weeks.map((item) => item.week_number));
  return <TodayOverview week={week} requestedWeek={requestedWeek} maxAvailableWeek={maxAvailableWeek} />;
}
