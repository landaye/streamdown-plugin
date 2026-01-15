import type { MermaidConfig } from "mermaid";
import packageJson from "../../package.json";

// Get mermaid version for CDN URL
const MERMAID_VERSION = (
  (packageJson.dependencies as any)?.mermaid ??
  packageJson.devDependencies?.mermaid ??
  "11"
).replace(/^\^/, "");

// Helper to construct the mermaid CDN URL from a base CDN URL
const getMermaidCdnUrl = (cdnBaseUrl: string) =>
  `${cdnBaseUrl}/mermaid/${MERMAID_VERSION}/mermaid.esm.min.mjs`;

// Cache the mermaid module once loaded (keyed by URL)
const mermaidModuleCache = new Map<string, typeof import("mermaid")>();

// Dynamic import that bypasses bundler static analysis (works with Webpack, Turbopack, etc.)
// Using direct dynamic import syntax that doesn't require unsafe-eval
const dynamicImport = (url: string) => import(url) as Promise<typeof import("mermaid")>;

export const initializeMermaid = async (
  customConfig?: MermaidConfig,
  cdnBaseUrl?: string | null
) => {
  const defaultConfig: MermaidConfig = {
    startOnLoad: false,
    theme: "default",
    securityLevel: "strict",
    fontFamily: "monospace",
    suppressErrorRendering: true,
  } as MermaidConfig;

  const config = { ...defaultConfig, ...customConfig };

  // If CDN is disabled (null) or no base URL provided, throw an error
  if (cdnBaseUrl === null || cdnBaseUrl === undefined) {
    throw new Error(
      "[Streamdown] Mermaid requires a CDN URL to load. Please provide a cdnUrl prop."
    );
  }

  const mermaidUrl = getMermaidCdnUrl(cdnBaseUrl);

  // Load mermaid from CDN if not cached for this URL
  if (!mermaidModuleCache.has(mermaidUrl)) {
    const module = await dynamicImport(mermaidUrl);
    mermaidModuleCache.set(mermaidUrl, module);
  }

  const mermaidModule = mermaidModuleCache.get(
    mermaidUrl
  ) as typeof import("mermaid");
  const mermaid = mermaidModule.default;

  // Always reinitialize with the current config to support different configs per component
  mermaid.initialize(config);

  return mermaid;
};

export const svgToPngBlob = (
  svgString: string,
  options?: { scale?: number }
): Promise<Blob> => {
  const scale = options?.scale ?? 5;

  return new Promise((resolve, reject) => {
    const encoded =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgString)));

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const w = img.width * scale;
      const h = img.height * scale;

      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Failed to create 2D canvas context for PNG export"));
        return;
      }

      // Do NOT draw a background → transparency preserved
      // ctx.clearRect(0, 0, w, h);

      ctx.drawImage(img, 0, 0, w, h);

      // Export PNG (lossless, keeps transparency)
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to create PNG blob"));
          return;
        }
        resolve(blob);
      }, "image/png");
    };

    img.onerror = () => reject(new Error("Failed to load SVG image"));
    img.src = encoded;
  });
};
