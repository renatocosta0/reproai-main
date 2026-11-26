"use client";

import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Health, type HealthDataType } from "@capgo/capacitor-health";
import { Activity, HeartPulse, Loader2, MoonStar, ShieldCheck, Thermometer, X } from "lucide-react";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import type { DeviceSample } from "@/lib/device-import";

interface HealthConnectModalProps {
  locale: "en" | "ar";
  onClose: () => void;
  onManualEntry: () => void;
  onSaved: (message: string) => void;
}

const T = {
  en: {
    title: "Apple Health & Health Connect",
    sub: "Reads sleep and basal-temperature data from Apple Health or Health Connect when this screen is running in the native app.",
    permissionsTitle: "Requested health permissions",
    permSleep: "Sleep duration (LOINC 93832-4)",
    permSleepDesc: "Daily asleep duration and stage data",
    permTemp: "Basal body temperature (LOINC 8310-5)",
    permTempDesc: "Morning waking temperature for ovulation tracking",
    permPassive: "Heart, wrist temperature & activity (optional)",
    permPassiveDesc: "Resting heart rate, HRV, sleeping wrist temperature (Apple Watch), steps, exercise and water — one summary per day, shown as context only",
    syncBtnGeneral: "Sync mobile health data",
    syncing: "Syncing from device…",
    unavailable: "Apple Health or Health Connect is not available in this browser or on this device. No data was imported. Enter readings manually instead.",
    consentRequired: "Enable wearable-data consent in Privacy & consent before syncing health data.",
    permissionDenied: "Health data access was not granted. No data was imported. Allow access or enter readings manually.",
    noData: "No sleep or basal-temperature readings were found in the selected health store. No sample data was created. Enter readings manually instead.",
    manualEntry: "Enter readings manually",
    privacyBadge: "Encrypted at rest · Never sold · Covered by Gate B consent",
    close: "Close",
    saved: (n: number) => `Successfully imported ${n} verified health reading${n === 1 ? "" : "s"} from mobile health store.`,
    error: "Could not sync health data from this device."
  },
  ar: {
    title: "Apple Health و Health Connect",
    sub: "تتم قراءة بيانات النوم ودرجة الحرارة الأساسية من Apple Health أو Health Connect عند استخدام التطبيق الأصلي.",
    permissionsTitle: "الأذونات الصحية المطلوبة",
    permSleep: "مدة النوم (LOINC 93832-4)",
    permSleepDesc: "مدة النوم اليومية وبيانات المراحل",
    permTemp: "درجة حرارة الجسم الأساسية (LOINC 8310-5)",
    permTempDesc: "حرارة الاستيقاظ الصباحية لتتبع التبويض",
    permPassive: "القلب وحرارة المعصم والنشاط (اختياري)",
    permPassiveDesc: "نبض الراحة وتقلب النبض وحرارة المعصم أثناء النوم (Apple Watch) والخطوات والتمارين والماء — ملخص واحد لكل يوم، للسياق فقط",
    syncBtnGeneral: "مزامنة بيانات الصحة من الهاتف",
    syncing: "جارٍ المزامنة من الجهاز…",
    unavailable: "Apple Health أو Health Connect غير متاح على هذا المتصفح أو الجهاز. لم يتم استيراد أي بيانات. أدخل القراءات يدويًا.",
    consentRequired: "فعّل موافقة بيانات الأجهزة القابلة للارتداء في صفحة الخصوصية والموافقة قبل مزامنة البيانات الصحية.",
    permissionDenied: "لم يتم منح إذن الوصول إلى البيانات الصحية. لم يتم استيراد أي بيانات. اسمح بالوصول أو أدخل القراءات يدويًا.",
    noData: "لم يتم العثور على قراءات للنوم أو الحرارة الأساسية في مصدر البيانات الصحي. لم يتم إنشاء بيانات تجريبية. أدخل القراءات يدويًا.",
    manualEntry: "إدخال القراءات يدويًا",
    privacyBadge: "مشفّرة أثناء التخزين · لا تُباع أبدًا · مشمولة بالموافقة",
    close: "إغلاق",
    saved: (n: number) => `تم استيراد ${n} ${n === 1 ? "قراءة موثّقة" : "قراءات موثّقة"} بنجاح من متجر الصحة.`,
    error: "تعذّر مزامنة البيانات الصحية من هذا الجهاز."
  }
};

export function HealthConnectModal({ locale, onClose, onManualEntry, onSaved }: HealthConnectModalProps) {
  const L = T[locale] || T.en;
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  async function handleSync() {
    setSyncing(true);
    setError("");

    try {
      if (typeof window === "undefined") throw new Error(L.unavailable);
      if (!Capacitor.isNativePlatform()) throw new Error(L.unavailable);
      const platform = Capacitor.getPlatform();

      const availability = await Health.isAvailable();
      if (!availability.available) throw new Error(L.unavailable);

      const consent = await api<{ consents?: Record<string, { granted?: boolean }> }>("/api/patient/consent");
      if (!consent.consents?.WEARABLES?.granted) throw new Error(L.consentRequired);

      // Passive signals are read as context; the server keeps one summary per day.
      const passive: HealthDataType[] = ["restingHeartRate", "heartRateVariability", "steps", "exerciseTime", "dietaryWater", ...(platform === "ios" ? (["appleSleepingWristTemperature"] as HealthDataType[]) : [])];
      const types: HealthDataType[] = ["sleep", "basalBodyTemperature", ...passive];
      const permission = await Health.requestAuthorization({ read: types, write: [] });
      const end = new Date();
      const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      const query = { startDate: start.toISOString(), endDate: end.toISOString(), limit: 2000 };
      const results = await Promise.allSettled(types.map((dataType) => Health.readSamples({ ...query, dataType })));
      const source = platform === "ios" ? "HEALTHKIT" : "HEALTH_CONNECT";
      const store = platform === "ios" ? "Apple Health" : "Health Connect";
      const samples: DeviceSample[] = results.flatMap((r, i) => {
        if (r.status !== "fulfilled") return [];
        const dataType = types[i];
        return r.value.samples.map((sample) => ({
          dataType,
          value: sample.value,
          unit: sample.unit || (dataType === "sleep" ? "minute" : dataType === "basalBodyTemperature" ? "celsius" : undefined),
          startDate: sample.startDate,
          endDate: sample.endDate,
          sourceName: sample.sourceName || store,
          deviceType: sample.deviceType,
          platformId: sample.platformId || sample.sourceId || `${dataType}:${sample.startDate}:${sample.endDate ?? ""}`,
          ...(dataType === "sleep" ? { sleepState: sample.sleepState, stages: sample.stages } : {})
        }));
      });

      if (samples.length === 0) {
        const denied = typeof permission === "object" && permission !== null &&
          "readDenied" in permission && Array.isArray(permission.readDenied) && permission.readDenied.length > 0;
        throw new Error(denied ? L.permissionDenied : L.noData);
      }

      // Send to ReproAI device import API
      const res = await api<{ temperatureAdded: number; temperatureDuplicates: number; sleepNightsSaved: number; dailySummariesSaved?: number }>("/api/observations/import", {
        method: "POST",
        body: JSON.stringify({
          source,
          device: platform === "ios" ? "Apple HealthKit" : "Google Health Connect",
          samples
        })
      });

      const importedCount = res.temperatureAdded + res.sleepNightsSaved + (res.dailySummariesSaved ?? 0);
      if (importedCount === 0) throw new Error(L.noData);
      onSaved(L.saved(importedCount));
      onClose();
    } catch (err) {
      setError(err instanceof Error && (err.message === L.unavailable || err.message === L.consentRequired || err.message === L.permissionDenied || err.message === L.noData)
        ? err.message
        : userMessage(err, L.error));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="panel health-connect-panel" style={{ marginBottom: 16 }}>
      <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div className="health-connect-icon" style={{ padding: 10, borderRadius: 12 }}>
            <Activity size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>{L.title}</h2>
            <p className="health-connect-sub" style={{ margin: 0, fontSize: 13 }}>{L.sub}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label={L.close} className="text-button" style={{ padding: 4 }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ padding: "0 20px 16px" }}>
        <div className="health-connect-permissions" style={{ padding: "12px 14px", borderRadius: 8, marginBottom: 16 }}>
          <span className="health-connect-permissions-title" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>
            {L.permissionsTitle}
          </span>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <MoonStar size={16} color="#6366f1" />
              <div>
                <strong style={{ fontSize: 13 }}>{L.permSleep}</strong>
                <small className="health-connect-sub" style={{ display: "block", fontSize: 11.5 }}>{L.permSleepDesc}</small>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Thermometer size={16} color="#ec4899" />
              <div>
                <strong style={{ fontSize: 13 }}>{L.permTemp}</strong>
                <small className="health-connect-sub" style={{ display: "block", fontSize: 11.5 }}>{L.permTempDesc}</small>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <HeartPulse size={16} color="#0c655e" />
              <div>
                <strong style={{ fontSize: 13 }}>{L.permPassive}</strong>
                <small className="health-connect-sub" style={{ display: "block", fontSize: 11.5 }}>{L.permPassiveDesc}</small>
              </div>
            </div>
          </div>
        </div>

        {error && <div style={{ marginBottom: 12 }}><FormError>{error}</FormError></div>}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div className="health-connect-privacy" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
            <ShieldCheck size={15} />
            <span>{L.privacyBadge}</span>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {error && (
              <button type="button" className="secondary compact" onClick={onManualEntry} disabled={syncing}>
                {L.manualEntry}
              </button>
            )}
            <button type="button" className="secondary compact" onClick={onClose} disabled={syncing}>
              {L.close}
            </button>
            <button type="button" className="primary compact" onClick={handleSync} disabled={syncing} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {syncing ? <Loader2 size={15} className="animate-spin" /> : <Activity size={15} />}
              <span>{syncing ? L.syncing : L.syncBtnGeneral}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
