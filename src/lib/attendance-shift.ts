const JAKARTA_UTC_OFFSET_HOURS = 7;

export const supportedShifts = ["08:00-17:00", "20:00-05:00"] as const;

function getJakartaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

function getShiftTimes(shift: string | null | undefined) {
  if (!shift || !supportedShifts.some((supportedShift) => supportedShift === shift)) {
    return null;
  }

  return shift.split("-").map((time) => time.split(":").map(Number));
}

export function getShiftStartAt(checkIn: Date, shift: string | null | undefined): Date | null {
  const times = getShiftTimes(shift);
  if (!times) return null;
  const [[startHour, startMinute]] = times;
  const values = getJakartaDateParts(checkIn);
  const startUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    startHour - JAKARTA_UTC_OFFSET_HOURS,
    startMinute,
  );
  return new Date(startUtc);
}

export function getShiftEndAt(checkIn: Date, shift: string | null | undefined): Date | null {
  const times = getShiftTimes(shift);
  if (!times) return null;
  const [[startHour, startMinute], [endHour, endMinute]] = times;
  const values = getJakartaDateParts(checkIn);
  const dayOffset = endHour * 60 + endMinute <= startHour * 60 + startMinute ? 1 : 0;
  const endUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day) + dayOffset,
    endHour - JAKARTA_UTC_OFFSET_HOURS,
    endMinute,
  );

  return new Date(endUtc);
}

export function getEligibleCheckoutAt(checkIn: Date, shift: string | null | undefined): Date | null {
  const times = getShiftTimes(shift);
  const scheduledEnd = getShiftEndAt(checkIn, shift);
  if (!times || !scheduledEnd) return null;
  const [[startHour, startMinute], [endHour, endMinute]] = times;
  let durationMinutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  if (durationMinutes <= 0) durationMinutes += 24 * 60;
  const workedDurationEnd = new Date(checkIn.getTime() + durationMinutes * 60_000);
  return workedDurationEnd > scheduledEnd ? workedDurationEnd : scheduledEnd;
}
