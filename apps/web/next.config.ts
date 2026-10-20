import type { NextConfig } from "next";

const config: NextConfig = {
  // Static export: the site is plain files on S3 behind CloudFront.
  output: "export",
  // /compare/ → /compare/index.html, which S3 + CloudFront serve without rewrites.
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@ctp/catalog"],
};

export default config;
