import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Upload do PDF do extrato da maquininha (Contas a receber)
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  serverExternalPackages: ["unpdf"],
};

export default nextConfig;
