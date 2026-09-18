import type { Metadata } from "next"
import { ShopSession } from "@/features/shop/components/shop-session"

export const metadata: Metadata = {
  title: "Tienda",
  alternates: { canonical: "/shop" },
}

export default function ShopPage() {
  return <ShopSession />
}
