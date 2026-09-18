import type { Metadata } from "next"
import { Notebook } from "@/features/mission/components/notebook"

export const metadata: Metadata = {
  title: "Cuaderno",
  alternates: { canonical: "/notebook" },
}

export default function NotebookPage() {
  return <Notebook />
}
