import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sequelize dynamically requires driver packages that aren't installed — bundling it breaks.
  serverExternalPackages: ["sequelize", "mysql2"],
};

export default nextConfig;
