export type Contact = {
  firstName: string;
  lastName: string;
  phone: string;
  workPhone: string;
  email: string;
  organization: string;
  title: string;
  website: string;
  street: string;
  city: string;
  region: string;
  postcode: string;
  country: string;
  note: string;
  // Display-only: printed under the QR code, never encoded in the vCard.
  position: string;
  unit: string;
  department: string;
};

export const emptyContact: Contact = {
  firstName: "",
  lastName: "",
  phone: "",
  workPhone: "",
  email: "",
  organization: "",
  title: "",
  website: "",
  street: "",
  city: "",
  region: "",
  postcode: "",
  country: "",
  note: "",
  position: "",
  unit: "",
  department: "",
};

/** Escape text per RFC 6350 (backslash, comma, semicolon, newline). */
function esc(value: string) {
  return value
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Every number is Malaysian; the form shows this as a fixed prefix. */
export const COUNTRY_CODE = "+60";

/** Strip a pasted +60, if any, so the field only holds the local part. */
export function stripCountryCode(value: string) {
  const v = value.trimStart();
  return v.startsWith(COUNTRY_CODE) ? v.slice(COUNTRY_CODE.length).trimStart() : value;
}

/** The local number without the trunk 0, e.g. "012 345 6789" → "12 345 6789". */
function localPart(value: string) {
  return stripCountryCode(value).trim().replace(/^0+/, "");
}

/** Number for captions, e.g. "012-345 6789" → "+60 123456789". */
export function displayPhone(value: string) {
  const digits = localPart(value).replace(/\D/g, "");
  return digits ? `${COUNTRY_CODE} ${digits}` : "";
}

/** E.164 form (+60 and digits only), so every phone app can dial it. */
export function normalizePhone(value: string) {
  const digits = localPart(value).replace(/\D/g, "");
  return digits ? `${COUNTRY_CODE}${digits}` : "";
}

/** Malaysian numbers have 8–10 digits after +60. */
function isValidPhone(value: string) {
  const digits = normalizePhone(value).length - COUNTRY_CODE.length;
  return digits >= 8 && digits <= 10;
}

export function fullName(c: Pick<Contact, "firstName" | "lastName">) {
  return [c.firstName.trim(), c.lastName.trim()].filter(Boolean).join(" ");
}

export function validate(c: Contact) {
  const errors: Partial<Record<keyof Contact, string>> = {};
  if (!c.firstName.trim()) errors.firstName = "First name is required";
  if (!normalizePhone(c.phone)) errors.phone = "Phone number is required";
  else if (!isValidPhone(c.phone)) errors.phone = "Enter a valid Malaysian number, e.g. 123456789";
  if (c.workPhone.trim() && !isValidPhone(c.workPhone)) errors.workPhone = "Enter a valid phone number";
  if (c.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim()))
    errors.email = "Enter a valid email address";
  return errors;
}

/**
 * Build a vCard 3.0 string. Version 3.0 is the most widely understood by
 * the native camera / contacts apps on both iOS and Android.
 */
export function buildVCard(c: Contact) {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  lines.push(`N:${esc(c.lastName)};${esc(c.firstName)};;;`);
  lines.push(`FN:${esc(fullName(c))}`);
  if (c.organization.trim()) lines.push(`ORG:${esc(c.organization)}`);
  if (c.title.trim()) lines.push(`TITLE:${esc(c.title)}`);
  if (c.phone.trim()) lines.push(`TEL;TYPE=CELL:${normalizePhone(c.phone)}`);
  if (c.workPhone.trim()) lines.push(`TEL;TYPE=WORK:${normalizePhone(c.workPhone)}`);
  if (c.email.trim()) lines.push(`EMAIL:${esc(c.email)}`);
  if (c.website.trim()) {
    const url = c.website.trim();
    lines.push(`URL:${/^https?:\/\//i.test(url) ? url : `https://${url}`}`);
  }
  if ([c.street, c.city, c.region, c.postcode, c.country].some((v) => v.trim())) {
    lines.push(
      `ADR;TYPE=WORK:;;${esc(c.street)};${esc(c.city)};${esc(c.region)};${esc(c.postcode)};${esc(c.country)}`,
    );
  }
  if (c.note.trim()) lines.push(`NOTE:${esc(c.note)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}
