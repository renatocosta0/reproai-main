import { describe, it, expect, vi } from "vitest";
import { isBiometricsSupported, isMobileDevice } from "./biometrics";

describe("Biometrics (FaceID / WebAuthn / Platform Authenticator)", () => {
  it("detects biometric availability when PublicKeyCredential is present", async () => {
    // Mock PublicKeyCredential on window
    const originalPK = (global as any).window?.PublicKeyCredential;
    (global as any).window = (global as any).window || {};
    (global as any).window.PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(true)
    };

    const supported = await isBiometricsSupported();
    expect(supported).toBe(true);

    if (originalPK) {
      (global as any).window.PublicKeyCredential = originalPK;
    }
  });

  it("handles missing PublicKeyCredential gracefully with mobile fallback", async () => {
    const originalPK = (global as any).window?.PublicKeyCredential;
    (global as any).window = (global as any).window || {};
    delete (global as any).window.PublicKeyCredential;

    const supported = await isBiometricsSupported();
    expect(supported).toBe(true);

    if (originalPK) {
      (global as any).window.PublicKeyCredential = originalPK;
    }
  });

  it("detects mobile client via userAgent or Capacitor", () => {
    // Ensure window is defined for testing environment
    (global as any).window = (global as any).window || {};

    const originalNavigator = (globalThis as any).navigator;

    try {
      // Test iPhone user agent
      Object.defineProperty(globalThis, "navigator", {
        value: {
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
          maxTouchPoints: 5,
        },
        configurable: true,
        writable: true,
      });
      expect(isMobileDevice()).toBe(true);

      // Test Desktop browser
      Object.defineProperty(globalThis, "navigator", {
        value: {
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
          maxTouchPoints: 0,
        },
        configurable: true,
        writable: true,
      });
      (global as any).window.innerWidth = 1440;
      expect(isMobileDevice()).toBe(false);

      // Test Capacitor native platform on desktop UA
      (global as any).window.Capacitor = {
        isNativePlatform: () => true,
      };
      expect(isMobileDevice()).toBe(true);
      delete (global as any).window.Capacitor;
    } finally {
      // Restore navigator
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    }
  });
});
