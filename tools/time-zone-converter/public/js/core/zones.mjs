// The 40-zone list pinned by SPEC section 4, shipped once as auditable data.
// Order is normative. Do not add, remove or reorder entries here; the build
// check verifies the count is 40 and that the platform Intl implementation
// accepts every name.
export const ZONES = Object.freeze([
  "Pacific/Auckland",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Perth",
  "Asia/Ulaanbaatar",
  "Asia/Vladivostok",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Taipei",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Manila",
  "Asia/Jakarta",
  "Asia/Kathmandu",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Karachi",
  "Asia/Tehran",
  "Asia/Dubai",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Europe/Athens",
  "Europe/Paris",
  "Europe/London",
  "Europe/Lisbon",
  "Atlantic/Reykjavik",
  "America/Sao_Paulo",
  "America/Bogota",
  "America/Toronto",
  "America/Mexico_City",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Santiago",
]);

export const ZONE_SET = new Set(ZONES);

export function isKnownZone(zone) {
  return typeof zone === "string" && ZONE_SET.has(zone);
}
