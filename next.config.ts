import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// The plugin finds src/i18n/request.ts, which loads the right messages file per request.
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
