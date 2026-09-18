import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "English Mission",
    short_name: "English Mission",
    description: "Aprende inglés viviendo una historia por misiones.",
    start_url: "/",
    display: "standalone",
    background_color: "#fef6e9",
    theme_color: "#f97316",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  }
}
