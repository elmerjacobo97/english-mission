import type { Metadata } from "next"
import { Notebook } from "@/features/mission/components/notebook"

export const metadata: Metadata = {
  title: "Cuaderno · English Mission",
}

export default function NotebookPage() {
  return <Notebook />
}
