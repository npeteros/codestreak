import { getStreakData } from "@/lib/actions/streak";
import { StreakHeader } from "./StreakHeader";

export async function StreakHeaderLoader() {
  const result = await getStreakData();
  if (!result.success) return null;
  return <StreakHeader {...result.data} />;
}
