// Decoder for the standard Bluetooth Low Energy Health Thermometer profile
// (GATT service 0x1809 "health_thermometer", characteristic 0x2A1C
// "temperature_measurement"). Thermometers that use a proprietary protocol
// instead of this profile will not appear in the browser's device picker.
//
// Temperature Measurement layout:
//   byte 0      flags: bit0 unit (0 = Celsius, 1 = Fahrenheit), bit1 time stamp present,
//               bit2 temperature type present
//   bytes 1-4   temperature, IEEE 11073-20601 32-bit FLOAT (little endian)
//   bytes 5-11  time stamp if bit1: year (uint16 LE), month, day, hours, minutes, seconds
//   next byte   temperature type if bit2 (2 = body/general, 3 = ear, 6 = mouth, ...)

export const HEALTH_THERMOMETER_SERVICE = "health_thermometer";
export const TEMPERATURE_MEASUREMENT = "temperature_measurement";

export interface ThermometerReading {
  celsius: number;
  /** Time the device says the reading was taken (device local time), if it sent one. */
  takenAt: Date | null;
  temperatureType: number | null;
}

/** IEEE 11073 32-bit FLOAT: signed 24-bit mantissa, signed 8-bit base-10 exponent. */
export function decodeIeee11073Float(raw: number): number | null {
  let mantissa = raw & 0x00ffffff;
  const exponent = (raw >> 24) << 0; // sign-extends the top byte
  // Reserved special values: NaN, NRes, +INF, -INF, reserved.
  if ([0x007fffff, 0x00800000, 0x007ffffe, 0x00800002, 0x00800001].includes(mantissa)) return null;
  if (mantissa & 0x00800000) mantissa -= 0x01000000;
  return mantissa * Math.pow(10, exponent);
}

export function parseTemperatureMeasurement(view: DataView): ThermometerReading | null {
  if (view.byteLength < 5) return null;
  const flags = view.getUint8(0);
  const value = decodeIeee11073Float(view.getUint32(1, true));
  if (value === null || !Number.isFinite(value)) return null;
  const celsius = flags & 0x01 ? ((value - 32) * 5) / 9 : value;

  let offset = 5;
  let takenAt: Date | null = null;
  if (flags & 0x02) {
    if (view.byteLength < offset + 7) return null;
    const year = view.getUint16(offset, true);
    const [month, day, hours, minutes, seconds] = [1, 2, 3, 4, 5].map((k) => view.getUint8(offset + 1 + k));
    // Year 0 / month 0 mean "not known" in the Bluetooth date-time format.
    if (year > 0 && month > 0 && day > 0) takenAt = new Date(year, month - 1, day, hours, minutes, seconds);
    offset += 7;
  }
  const temperatureType = flags & 0x04 && view.byteLength > offset ? view.getUint8(offset) : null;
  return { celsius: Math.round(celsius * 100) / 100, takenAt, temperatureType };
}
