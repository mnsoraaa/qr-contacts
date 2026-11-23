import Papa from "papaparse";
import { readSheet } from "read-excel-file/browser";
import { parsePhoneNumber, type Country } from "react-phone-number-input";

import { emptyContact, PHONE_COUNTRIES, validate, type Contact } from "@/lib/vcard";

type Column = { key: keyof Contact; header: string; aliases: string[]; required?: boolean; example: string };

/** Template columns, in order. `aliases` let the app read spreadsheets with slightly different headers. */
export const COLUMNS: Column[] = [
  { key: "firstName", header: "First name", aliases: ["firstname", "first", "givenname", "name"], required: true, example: "John" },
  { key: "lastName", header: "Last name", aliases: ["lastname", "last", "surname", "familyname"], example: "Doe" },
  { key: "phone", header: "Mobile", aliases: ["mobile", "mobilenumber", "mobilephone", "phone", "phonenumber", "handphone", "hp"], required: true, example: "+60123456789" },
  { key: "position", header: "Position", aliases: ["position", "jobtitle", "title", "designation"], example: "Senior Engineer" },
  { key: "unit", header: "Unit", aliases: ["unit", "section"], example: "Network Operations" },
  { key: "department", header: "Department", aliases: ["department", "dept", "division"], example: "IT Department" },
  { key: "organization", header: "Company", aliases: ["company", "organization", "organisation", "org"], example: "Acme Inc." },
  { key: "email", header: "Email", aliases: ["email", "emailaddress", "mail"], example: "johndoe@example.com" },
  { key: "workPhone", header: "Work phone", aliases: ["workphone", "officephone", "office", "worknumber"], example: "+60312345678" },
  { key: "website", header: "Website", aliases: ["website", "url", "web"], example: "johndoe.com" },
  { key: "street", header: "Street", aliases: ["street", "address", "streetaddress"], example: "Level 3, Main Street" },
  { key: "city", header: "City", aliases: ["city", "town"], example: "Johor Bahru" },
  { key: "region", header: "State", aliases: ["state", "region", "province"], example: "Johor" },
  { key: "postcode", header: "Postcode", aliases: ["postcode", "postalcode", "zip", "zipcode"], example: "79250" },
  { key: "country", header: "Country", aliases: ["country"], example: "Malaysia" },
  { key: "note", header: "Note", aliases: ["note", "notes", "remarks"], example: "" },
];

const LABEL: Partial<Record<keyof Contact, string>> = Object.fromEntries(COLUMNS.map((c) => [c.key, c.header]));

/** "Mobile Number" → "mobilenumber", so header matching ignores case, spaces and punctuation. */
const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

/** CSV template with a header row and one example row. The BOM makes Excel open it as UTF-8. */
export function templateCsv() {
  const csv = Papa.unparse([COLUMNS.map((c) => c.header), COLUMNS.map((c) => c.example)]);
  return new Blob(["﻿" + csv + "\r\n"], { type: "text/csv;charset=utf-8" });
}

/** Read a .csv or .xlsx file into rows of text cells. */
async function readRows(file: File): Promise<string[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    const sheet = await readSheet(file);
    return sheet.map((row) => row.map((cell) => (cell == null ? "" : String(cell))));
  }
  const text = await file.text();
  const { data } = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: "greedy" });
  return data;
}

/**
 * Read a phone number typed in a spreadsheet. Excel often drops the "+" and leading 0,
 * so "60123456789" and "123456789" are accepted too. Returns E.164, or an error message.
 */
function parseSheetPhone(raw: string): { value: string } | { error: string } {
  const s = raw.trim();
  if (!s) return { value: "" };
  if (/\d[.,]?\d*e\+?\d+/i.test(s)) {
    return { error: "was changed to scientific notation by Excel (e.g. 6.01E+10). Format the column as Text and retype it" };
  }
  const digits = s.replace(/\D/g, "");
  // Excel removed the "+": a long number starting with 60 or 65 already has its country code.
  const candidate = !s.startsWith("+") && /^(60|65)/.test(digits) && digits.length >= 10 ? `+${digits}` : s;
  for (const country of PHONE_COUNTRIES) {
    try {
      const p = parsePhoneNumber(candidate, country as Country);
      if (p?.isValid() && p.country && PHONE_COUNTRIES.includes(p.country)) return { value: p.number };
    } catch {
      /* try the next country */
    }
  }
  return { error: "is not a valid Malaysian or Singapore number" };
}

export type ValidRow = { row: number; contact: Contact };
export type InvalidRow = { row: number; name: string; problems: string[] };
export type ImportResult = { valid: ValidRow[]; invalid: InvalidRow[] };

/** Read a spreadsheet, map its columns and check every row like the single-contact form does. */
export async function importContacts(file: File): Promise<ImportResult> {
  const rows = await readRows(file);
  if (rows.length === 0) throw new Error("The file is empty.");

  // Map each template column to its index in the file's header row.
  const headers = rows[0].map((h) => normalizeHeader(String(h)));
  const index = new Map<keyof Contact, number>();
  for (const col of COLUMNS) {
    const i = headers.findIndex((h) => h === normalizeHeader(col.header) || col.aliases.includes(h));
    if (i >= 0) index.set(col.key, i);
  }
  const missing = COLUMNS.filter((c) => c.required && !index.has(c.key)).map((c) => `"${c.header}"`);
  if (missing.length) {
    throw new Error(`Missing column ${missing.join(" and ")}. Download the template to see the expected columns.`);
  }

  const valid: ValidRow[] = [];
  const invalid: InvalidRow[] = [];
  rows.slice(1).forEach((cells, i) => {
    const row = i + 2; // Spreadsheet row number: header is row 1.
    if (cells.every((c) => !String(c ?? "").trim())) return;

    const contact: Contact = { ...emptyContact };
    for (const [key, col] of index) (contact[key] as string) = String(cells[col] ?? "").trim();

    const problems: string[] = [];
    for (const key of ["phone", "workPhone"] as const) {
      const parsed = parseSheetPhone(contact[key]);
      if ("error" in parsed) problems.push(`${LABEL[key]} "${contact[key]}" ${parsed.error}`);
      else contact[key] = parsed.value;
    }
    // Phone problems are already reported above with the original value.
    for (const [key, message] of Object.entries(validate(contact)) as [keyof Contact, string][]) {
      if ((key === "phone" || key === "workPhone") && problems.some((p) => p.startsWith(LABEL[key]!))) continue;
      problems.push(message);
    }

    const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
    if (problems.length) invalid.push({ row, name, problems });
    else valid.push({ row, contact });
  });

  return { valid, invalid };
}
