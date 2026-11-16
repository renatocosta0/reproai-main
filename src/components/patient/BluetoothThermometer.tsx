"use client";

import { useEffect, useRef, useState } from "react";
import { Bluetooth, BluetoothOff, Check, Loader2, X } from "lucide-react";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { HEALTH_THERMOMETER_SERVICE, parseTemperatureMeasurement, TEMPERATURE_MEASUREMENT, type ThermometerReading } from "@/lib/ble-thermometer";

// Minimal Web Bluetooth types (not part of TypeScript's DOM library).
interface BleCharacteristic extends EventTarget {
  value?: DataView;
  startNotifications(): Promise<BleCharacteristic>;
}
interface BleDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: {
    connected: boolean;
    connect(): Promise<{ getPrimaryService(s: string): Promise<{ getCharacteristic(c: string): Promise<BleCharacteristic> }> }>;
    disconnect(): void;
  };
}
type BluetoothNavigator = Navigator & {
  bluetooth?: { requestDevice(o: { filters: { services: string[] }[] }): Promise<BleDevice> };
};

const S = {
  en: {
    title: "Bluetooth thermometer",
    intro:
      "Connect a thermometer that uses the standard Bluetooth health thermometer profile, then take your temperature as usual. Readings appear here; nothing is saved until you choose Save.",
    unsupported:
      "This browser cannot connect to Bluetooth devices. Use Chrome or Edge on Android or a computer. iPhone browsers do not support Web Bluetooth.",
    connect: "Connect thermometer",
    connecting: "Connecting…",
    connected: (name: string) => `Connected to ${name}. Take a reading now.`,
    waiting: "Waiting for a reading…",
    save: (n: number) => `Save ${n} reading${n === 1 ? "" : "s"}`,
    saving: "Saving…",
    disconnect: "Disconnect",
    close: "Close",
    noDevice: "No thermometer was selected.",
    notStandard: "This device does not offer the standard health thermometer service. Thermometers with their own app protocol cannot connect here.",
    outOfRange: (c: number) => `Ignored a reading of ${c} °C (outside 34–40 °C).`,
    saved: (added: number, dup: number) => `Saved ${added} reading${added === 1 ? "" : "s"}${dup ? `; ${dup} already on record` : ""}.`,
    deviceTime: "time from device",
    receivedTime: "time received",
    saveError: "The readings could not be saved."
  },
  ar: {
    title: "ميزان حرارة بلوتوث",
    intro: "صِل ميزان حرارة يستخدم ملف ميزان الحرارة الصحي القياسي عبر البلوتوث، ثم قِس حرارتك كالمعتاد. تظهر القراءات هنا، ولا يُحفظ شيء حتى تختار حفظ.",
    unsupported: "لا يستطيع هذا المتصفح الاتصال بأجهزة البلوتوث. استخدم Chrome أو Edge على أندرويد أو على حاسوب. متصفحات iPhone لا تدعم Web Bluetooth.",
    connect: "صِل الميزان",
    connecting: "جارٍ الاتصال…",
    connected: (name: string) => `متصل بـ ${name}. قِس حرارتك الآن.`,
    waiting: "بانتظار قراءة…",
    save: (n: number) => `احفظ ${n} ${n === 1 ? "قراءة" : "قراءات"}`,
    saving: "جارٍ الحفظ…",
    disconnect: "افصل",
    close: "إغلاق",
    noDevice: "لم يُختر ميزان حرارة.",
    notStandard: "لا يوفّر هذا الجهاز خدمة ميزان الحرارة الصحي القياسية. لا يمكن ربط الموازين التي تستخدم بروتوكول تطبيقها الخاص هنا.",
    outOfRange: (c: number) => `تم تجاهل قراءة ${c} °م (خارج 34–40 °م).`,
    saved: (added: number, dup: number) => `حُفظت ${added} ${added === 1 ? "قراءة" : "قراءات"}${dup ? `؛ ${dup} مسجّلة مسبقًا` : ""}.`,
    deviceTime: "الوقت من الجهاز",
    receivedTime: "وقت الاستلام",
    saveError: "تعذّر حفظ القراءات."
  }
};

interface Captured extends ThermometerReading {
  receivedAt: Date;
}

interface ImportResponse {
  temperatureAdded: number;
  temperatureDuplicates: number;
}

/** Reads a standard BLE health thermometer in the browser and saves readings through the device import API. */
export function BluetoothThermometer({ locale, onSaved, onClose }: { locale: "en" | "ar"; onSaved: (message: string) => void; onClose: () => void }) {
  const L = S[locale];
  const [supported, setSupported] = useState<boolean | null>(null);
  const [device, setDevice] = useState<BleDevice | null>(null);
  const [busy, setBusy] = useState<"" | "connecting" | "saving">("");
  const [readings, setReadings] = useState<Captured[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const deviceRef = useRef<BleDevice | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && window.isSecureContext && Boolean((navigator as BluetoothNavigator).bluetooth));
    return () => deviceRef.current?.gatt?.disconnect();
  }, []);

  async function connect() {
    setError("");
    setNotice("");
    const bt = (navigator as BluetoothNavigator).bluetooth;
    if (!bt) return;
    setBusy("connecting");
    let stage: "pick" | "connect" = "pick";
    try {
      const d = await bt.requestDevice({ filters: [{ services: [HEALTH_THERMOMETER_SERVICE] }] });
      stage = "connect";
      d.addEventListener("gattserverdisconnected", () => setDevice(null));
      const server = await d.gatt!.connect();
      const service = await server.getPrimaryService(HEALTH_THERMOMETER_SERVICE);
      const characteristic = await service.getCharacteristic(TEMPERATURE_MEASUREMENT);
      characteristic.addEventListener("characteristicvaluechanged", (e) => {
        const view = (e.target as BleCharacteristic).value;
        const r = view ? parseTemperatureMeasurement(view) : null;
        if (!r) return;
        if (r.celsius < 34 || r.celsius > 40) return setNotice(L.outOfRange(r.celsius));
        setReadings((cur) => [...cur, { ...r, receivedAt: new Date() }]);
      });
      await characteristic.startNotifications();
      deviceRef.current = d;
      setDevice(d);
    } catch (err) {
      // Closing the picker throws NotFoundError at the "pick" step; a device without
      // the standard service fails at the "connect" step.
      if (stage === "pick") setError(L.noDevice);
      else setError(err instanceof Error && err.name !== "NotFoundError" && err.name !== "NotSupportedError" ? err.message : L.notStandard);
    } finally {
      setBusy("");
    }
  }

  function disconnect() {
    device?.gatt?.disconnect();
    setDevice(null);
  }

  async function save() {
    setBusy("saving");
    setError("");
    try {
      const name = device?.name || deviceRef.current?.name || "Bluetooth thermometer";
      const res = await api<ImportResponse>("/api/observations/import", {
        method: "POST",
        body: JSON.stringify({
          source: "BLUETOOTH",
          device: name,
          samples: readings.map((r) => {
            const at = (r.takenAt ?? r.receivedAt).toISOString();
            return { dataType: "bodyTemperature", value: r.celsius, unit: "celsius", startDate: at, endDate: at, sourceName: name, platformId: `${deviceRef.current?.id ?? "ble"}:${at}` };
          })
        })
      });
      setReadings([]);
      onSaved(L.saved(res.temperatureAdded, res.temperatureDuplicates));
    } catch (err) {
      setError(userMessage(err, L.saveError));
    } finally {
      setBusy("");
    }
  }

  const fmt = (d: Date) => d.toLocaleString(locale === "ar" ? "ar-AE-u-nu-latn" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <section className="panel assessment-form">
      <div className="panel-head">
        <div>
          <h2><Bluetooth size={18} style={{ verticalAlign: "-3px" }} /> {L.title}</h2>
          <p>{L.intro}</p>
        </div>
        <button type="button" className="secondary compact" onClick={() => { disconnect(); onClose(); }} aria-label={L.close}>
          <X size={15} />
        </button>
      </div>

      {supported === false && (
        <p className="shap-footnote"><BluetoothOff size={15} style={{ verticalAlign: "-3px" }} /> {L.unsupported}</p>
      )}

      {supported && !device && (
        <button type="button" className="primary" onClick={connect} disabled={busy === "connecting"}>
          {busy === "connecting" ? <><Loader2 size={16} className="animate-spin" /> {L.connecting}</> : <><Bluetooth size={16} /> {L.connect}</>}
        </button>
      )}

      {device && (
        <>
          <p><Check size={15} style={{ verticalAlign: "-3px" }} /> {L.connected(device.name || L.title)}</p>
          {readings.length === 0 ? (
            <p className="shap-footnote">{L.waiting}</p>
          ) : (
            <ul style={{ margin: "8px 0 12px", paddingInlineStart: 18 }}>
              {readings.map((r, i) => (
                <li key={i}>
                  <strong>{r.celsius.toFixed(2)} °C</strong> · {fmt(r.takenAt ?? r.receivedAt)} ({r.takenAt ? L.deviceTime : L.receivedTime})
                </li>
              ))}
            </ul>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="primary" onClick={save} disabled={readings.length === 0 || busy === "saving"}>
              {busy === "saving" ? L.saving : L.save(readings.length)}
            </button>
            <button type="button" className="secondary" onClick={disconnect}>{L.disconnect}</button>
          </div>
        </>
      )}

      {notice && <p className="shap-footnote">{notice}</p>}
      {error && <FormError>{error}</FormError>}
    </section>
  );
}
