import { isValidPhoneNumber, parsePhoneNumber, type Country } from "react-phone-number-input";

export type Contact = {
  firstName: string;
  lastName: string;
  // Phone numbers are stored in E.164 form, e.g. "+60123456789".
  phone: string;
  workPhone: string;
  email: string;
  organization: string;
  website: string;
  street: string;
  city: string;
  region: string;
  postcode: string;
  country: string;
  note: string;
  // Printed under the QR code and saved to the contact (TITLE and ORG).
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

/**
 * Escape text for a vCard value. Commas are left as-is: RFC 6350 says to escape
 * them, but some phones' contacts apps then show a literal "\," to the user.
 * Semicolons must stay escaped because they separate the parts of N and ADR.
 */
function esc(value: string) {
  return value
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;");
}

/** Countries offered in the phone pickers; the first is the default. */
export const PHONE_COUNTRIES: Country[] = ["MY", "SG"];
export const DEFAULT_PHONE_COUNTRY: Country = "MY";

/** Valid for its country (per libphonenumber) and from one of PHONE_COUNTRIES. */
function isValidPhone(value: string) {
  if (!isValidPhoneNumber(value)) return false;
  const country = parsePhoneNumber(value)?.country;
  return !!country && PHONE_COUNTRIES.includes(country);
}

/**
 * Turn a number saved by an older version (local digits plus a separate
 * country, or a "+60 12 345 6789" string) into E.164. Unparseable input is kept.
 */
export function toE164(value: string, country: string = DEFAULT_PHONE_COUNTRY) {
  if (!value.trim()) return "";
  const c = PHONE_COUNTRIES.includes(country as Country) ? (country as Country) : DEFAULT_PHONE_COUNTRY;
  try {
    return parsePhoneNumber(value, c)?.number ?? value;
  } catch {
    return value;
  }
}

export function fullName(c: Pick<Contact, "firstName" | "lastName">) {
  return [c.firstName.trim(), c.lastName.trim()].filter(Boolean).join(" ");
}

export function validate(c: Contact) {
  const errors: Partial<Record<keyof Contact, string>> = {};
  if (!c.firstName.trim()) errors.firstName = "First name is required";
  if (!c.phone) errors.phone = "Phone number is required";
  else if (!isValidPhone(c.phone)) errors.phone = "Enter a valid Malaysian or Singapore number";
  if (c.workPhone && !isValidPhone(c.workPhone)) errors.workPhone = "Enter a valid Malaysian or Singapore number";
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
  // Company and job title are standard fields on every phone. Department is not:
  // it can only ride along as a second part of ORG ("Company;Department"), which
  // some Android contacts apps glue onto the company with no space. So unit and
  // department go in the job title instead: "Position, Unit, Department".
  if (c.organization.trim()) lines.push(`ORG:${esc(c.organization)}`);
  const title = [c.position, c.unit, c.department].map((v) => v.trim()).filter(Boolean).join(", ");
  if (title) lines.push(`TITLE:${esc(title)}`);
  if (c.phone) lines.push(`TEL;TYPE=CELL:${c.phone}`);
  if (c.workPhone) lines.push(`TEL;TYPE=WORK:${c.workPhone}`);
  if (c.email.trim()) lines.push(`EMAIL:${esc(c.email)}`);
  if (c.website.trim()) {
    const url = c.website.trim();
    lines.push(`URL:${/^https?:\/\//i.test(url) ? url : `https://${url}`}`);
  }
  // The whole address goes in the street part, Malaysian style:
  // "Level 3, Sunway Bigbox, 79250 Iskandar Puteri, Johor, Malaysia".
  // Splitting it into city/state/postcode parts makes some Android contacts apps
  // glue them together with no spaces.
  const cityLine = [c.postcode, c.city].map((v) => v.trim()).filter(Boolean).join(" ");
  const address = [c.street, cityLine, c.region, c.country].map((v) => v.trim()).filter(Boolean).join(", ");
  if (address) lines.push(`ADR;TYPE=WORK:;;${esc(address)};;;;`);
  if (c.note.trim()) lines.push(`NOTE:${esc(c.note)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}
