import { getFixedCosts, getVariableCosts, getSettings, getGuestRows } from "@/lib/queries";
import { getSession } from "@/lib/auth";
import { getSeatingState } from "@/lib/seating-queries";
import { AdminApp } from "@/components/admin/AdminApp";

export const dynamic = "force-dynamic"; // always read fresh from the DB

export default async function AdminPage() {
  const session = await getSession();
  const role = session?.role ?? "planner";
  const isCouple = role === "couple";

  // The planner role only manages guests: budget data (fixed/variable costs,
  // cancel/contingency params) is never fetched nor serialized to her client.
  const [fixedCosts, varCosts, settings, guests, seating] = await Promise.all([
    isCouple ? getFixedCosts() : Promise.resolve([]),
    isCouple ? getVariableCosts() : Promise.resolve([]),
    getSettings(),
    getGuestRows(),
    isCouple ? getSeatingState() : Promise.resolve(null),
  ]);

  return (
    <AdminApp
      role={role}
      initial={{
        fixedCosts,
        varCosts,
        guests,
        cancelRate: isCouple ? settings.cancel_rate : 0,
        contingency: isCouple ? settings.contingency : 0,
        coupleNames: settings.couple_names,
        seating,
      }}
    />
  );
}
