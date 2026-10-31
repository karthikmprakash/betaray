import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Betaray — See beyond the surface",
    short_name: "Betaray",
    description:
      "Test management that brings clarity to complexity, with Jira Cloud integration and an open-source, self-hosted core.",
    start_url: "/app",
    display: "standalone",
    background_color: "#F7F5F0",
    theme_color: "#526E69",
    icons: [
      { src: "/brand/betaray/betaray-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/betaray/betaray-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/betaray/betaray-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
