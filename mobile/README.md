# ReproAI Capacitor app

The native app bundles a static export of the existing Next.js patient portal: the existing login and patient routes, layouts, components, styling, consent screens, and wearable page. There is no separate patient UI. The hosted Next.js server continues to provide API routes, database access, cookie sessions for the web portal, and role/consent enforcement.

## Build

1. Copy `.env.mobile.example` to `.env.mobile` and set `NEXT_PUBLIC_API_BASE_URL` to the production HTTPS origin.
2. Configure the hosted API's `CAPACITOR_ALLOWED_ORIGINS` for the Capacitor origins (`https://localhost,capacitor://localhost`).
3. Run `npm run mobile:sync` to statically export the existing patient screens and synchronize Android/iOS.

The native login endpoint returns a patient-only eight-hour bearer token. It remains in JavaScript memory, so the patient signs in again after the app process restarts. Web sessions continue using the existing HttpOnly cookie flow.

## Health data

The existing patient wearables screen now invokes `@capgo/capacitor-health` directly when running natively. It requests read-only sleep and basal-temperature permissions, checks the ReproAI `WEARABLES` consent separately, reads the last 30 days, and sends only returned samples to `POST /api/observations/import`. In browsers, manual entry and the existing Bluetooth thermometer workflow remain available.

The Android app bundles a concise health-data privacy summary for Health Connect. Before Play distribution, publish the full service privacy policy and configure its public URL in the Health Connect and Play Console declarations.

## Device builds

Capacitor 8 requires Node.js 22 or newer. Android builds require Android Studio and the SDK. iOS builds and HealthKit capability/signing require macOS with Xcode. Test both integrations on physical devices with existing Apple Health or Health Connect readings before release.
