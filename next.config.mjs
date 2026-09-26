/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow dev server access from your LAN IP (or tunnel URL). Safe to keep in dev.
  allowedDevOrigins: ["http://localhost:3000", "http://127.0.0.1:3000", "http://192.168.29.234:3000"],
};

export default nextConfig;
