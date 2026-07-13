import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Cloudinary — everything uploaded through the admin.
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Unsplash — the approved design's reference imagery and the CMS defaults.
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],
  },

  // Fail the build on lint or type errors. Both default to false in Next 15's
  // template, which is how the delivered project shipped with a broken build.
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },

  async redirects() {
    return [
      // The approved frontend routes ventures under /ventures; the original
      // backend used /projects. Anything already pointing at /projects — old
      // links, indexed pages, bookmarks — is moved permanently rather than 404ed.
      { source: "/projects", destination: "/ventures", permanent: true },
      { source: "/projects/:slug", destination: "/ventures/:slug", permanent: true },
      // /admin on its own is not a page.
      { source: "/admin", destination: "/admin/dashboard", permanent: false },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
