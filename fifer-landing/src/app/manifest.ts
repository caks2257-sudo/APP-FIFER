import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "FIFER Living OS",
    short_name: "FIFER",
    description:
      "Command Center Living OS — resiliencia offline en obra (Chicureo y más).",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0f1e",
    theme_color: "#eab308",
    orientation: "any",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/fifer-icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/fifer-icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
