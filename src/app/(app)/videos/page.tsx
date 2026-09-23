import type { Metadata } from "next"
import { VideosPage } from "@/features/videos/components/videos-page"
import { createVideoRepository } from "@/features/videos/server/video-repository.server"
import { requireCourseBand } from "@/shared/lib/progress/require-course-band.server"
import type { VideoLibraryItem } from "@/features/videos/utils/video"

export const metadata: Metadata = {
  title: "Videos",
  alternates: { canonical: "/videos" },
}

export default async function VideosRoute() {
  const { user } = await requireCourseBand()
  let initialVideos: VideoLibraryItem[] = []
  let initialError: string | null = null

  if (user) {
    try {
      const repository = await createVideoRepository()
      initialVideos = await repository.list(user.id)
    } catch {
      initialError = "No pudimos cargar tu biblioteca. Intenta de nuevo."
    }
  }

  return <VideosPage initialVideos={initialVideos} initialError={initialError} />
}
