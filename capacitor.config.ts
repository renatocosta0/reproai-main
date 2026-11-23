// Capacitor serves a static export of the existing Next.js patient portal.
// The full Next.js runtime, API routes, authentication checks, and database
// remain hosted; the bundled UI calls that backend over HTTPS.

const config = {
  appId: "ae.reproai.app",
  appName: "ReproAI",
  webDir: "mobile/dist",
  server: {
    androidScheme: "https",
    iosScheme: "https"
  }
};

export default config;
