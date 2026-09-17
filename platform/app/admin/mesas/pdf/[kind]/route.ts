import { getSession } from "@/lib/auth";
import { getGuestRows, getSettings } from "@/lib/queries";
import { getSeatingState } from "@/lib/seating-queries";
import { buildSeatingPdf, PDF_FILENAMES, type PdfKind } from "@/lib/seating-pdf";

export const dynamic = "force-dynamic";

// Descargas del acomodo (solo novios): plano numerado, lista por mesa y lista
// alfabética "encuentra tu mesa". Se generan al momento con pdf-lib.
const KINDS: PdfKind[] = ["plano", "mesas", "alfabetico"];

export async function GET(_req: Request, ctx: { params: Promise<{ kind: string }> }) {
  const session = await getSession();
  if (session?.role !== "couple") return new Response("Forbidden", { status: 403 });
  const { kind } = await ctx.params;
  if (!KINDS.includes(kind as PdfKind)) return new Response("Not found", { status: 404 });
  const [state, guests, settings] = await Promise.all([getSeatingState(), getGuestRows(), getSettings()]);
  const bytes = await buildSeatingPdf(kind as PdfKind, { ...state, guests, coupleNames: settings.couple_names });
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${PDF_FILENAMES[kind as PdfKind]}"`,
      "Cache-Control": "no-store",
    },
  });
}
