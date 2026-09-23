import type { Metadata } from "next"
import { ShopSession } from "@/features/shop/components/shop-session"
import { requireCourseBand } from "@/shared/lib/progress/require-course-band.server"

export const metadata: Metadata = {
  title: "Tienda",
  alternates: { canonical: "/shop" },
}

export default async function ShopPage() {
  await requireCourseBand()
  return <ShopSession />
}
