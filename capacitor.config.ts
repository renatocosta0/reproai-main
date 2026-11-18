// Capacitor configuration for ReproAI mobile application.
// Connects the Next.js frontend with native iOS and Android capabilities:
// - Apple HealthKit (iOS) & Google Health Connect (Android) via @capgo/capacitor-health
// - Biometric authentication (FaceID / TouchID / Biometrics)
// - Bluetooth Low Energy (BLE) for basal body thermometers

const config = {
  appId: "ae.reproai.app",
  appName: "ReproAI",
  webDir: "out",
  server: {
    androidScheme: "https",
    iosScheme: "https"
  },
  plugins: {
    CapacitorHealth: {
      permissions: {
        read: ["sleep", "basalBodyTemperature", "bodyTemperature"],
        write: []
      }
    },
    BiometricAuth: {
      reason: "Authenticate with FaceID to access your reproductive health record",
      cancelTitle: "Use password instead"
    }
  }
};

export default config;
