import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        https: false,
        "node:fs": false,
        "node:https": false,
      };
      config.resolve.alias = {
        ...config.resolve.alias,
        "node:fs": false,
        "node:https": false,
      };
      const emptyModulePath = path.resolve(
        process.cwd(),
        "src/features/editor/persistence/emptyModule.ts",
      );
      config.plugins.push({
        apply(compiler: any) {
          compiler.hooks.normalModuleFactory.tap(
            "GarranchosNodeImportFallback",
            (normalModuleFactory: any) => {
              normalModuleFactory.hooks.beforeResolve.tap(
                "GarranchosNodeImportFallback",
                (request: any) => {
                  if (
                    request &&
                    (request.request === "node:fs" ||
                      request.request === "node:https")
                  ) {
                    request.request = emptyModulePath;
                  }
                },
              );
            },
          );
        },
      });
    }

    return config;
  },
};

export default nextConfig;
