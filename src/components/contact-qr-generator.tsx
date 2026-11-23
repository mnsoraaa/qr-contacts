"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import {
  BriefcaseIcon,
  Building2Icon,
  CheckIcon,
  ChevronDownIcon,
  LayersIcon,
  PhoneIcon,
  UserIcon,
  type LucideIcon,
  DownloadIcon,
  EyeIcon,
  PrinterIcon,
  QrCodeIcon,
  RotateCcwIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { PhoneField } from "@/components/phone-field";
import { buildVCard, emptyContact, fullName, toE164, validate, type Contact } from "@/lib/vcard";

type PhoneKey = "phone" | "workPhone";

type PrintSize = "small" | "medium" | "large";

type Options = {
  showName: boolean;
  showPhone: boolean;
  showPosition: boolean;
  showUnit: boolean;
  showDepartment: boolean;
  size: PrintSize;
};

const defaultOptions: Options = {
  showName: true,
  showPhone: true,
  showPosition: true,
  showUnit: true,
  showDepartment: true,
  size: "medium",
};

type ShowOption = "showName" | "showPosition" | "showUnit" | "showDepartment" | "showPhone";

/** Label lines the user can show or hide, in the order they appear under the QR code. */
const TOGGLES: { option: ShowOption; label: string; icon: LucideIcon }[] = [
  { option: "showName", label: "Name", icon: UserIcon },
  { option: "showPhone", label: "Phone", icon: PhoneIcon },
  { option: "showPosition", label: "Position", icon: BriefcaseIcon },
  { option: "showUnit", label: "Unit", icon: LayersIcon },
  { option: "showDepartment", label: "Department", icon: Building2Icon },
];

/** A line of text shown under the QR code; `primary` is the bold headline. */
type Caption = { key: string; text: string; primary?: boolean };

/** QR edge length on paper, in millimetres. */
const PRINT_MM: Record<PrintSize, number> = { small: 35, medium: 55, large: 90 };
const STORAGE_KEY = "qr-contacts:v1";

type Saved = { contact?: Partial<Contact>; options?: Partial<Options> };

function loadSaved(): Saved {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") ?? {};
  } catch {
    return {};
  }
}

const hasExtras = (c: Contact) =>
  [c.workPhone, c.email, c.organization, c.website, c.street, c.city, c.region, c.postcode, c.country, c.note].some(
    (v) => v.trim(),
  );

/** Client-only (rendered with ssr:false) so saved data can seed initial state. */
export function ContactQrGenerator() {
  // Restore the last contact from this device (data never leaves the browser).
  const [saved] = useState(loadSaved);
  const [contact, setContact] = useState<Contact>(() => {
    // Older saves had a separate "Job title" field, now merged into Position.
    // Older saves kept local digits plus a separate country; phones are now E.164.
    const { title, phoneCountry, workPhoneCountry, ...rest } = (saved.contact ?? {}) as Partial<Contact> & {
      title?: string;
      phoneCountry?: string;
      workPhoneCountry?: string;
    };
    const c = { ...emptyContact, ...rest };
    if (!c.position.trim() && title) c.position = title;
    c.phone = toE164(c.phone, phoneCountry);
    c.workPhone = toE164(c.workPhone, workPhoneCountry);
    return c;
  });
  const [options, setOptions] = useState<Options>(() => ({ ...defaultOptions, ...saved.options }));
  const [touched, setTouched] = useState<Partial<Record<keyof Contact, boolean>>>({});
  const [showMore, setShowMore] = useState(() => hasExtras(contact));
  const [previewVisible, setPreviewVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ contact, options }));
    } catch {
      /* ignore */
    }
  }, [contact, options]);

  // Hide the mobile "View QR" bar while the preview is already on screen.
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setPreviewVisible(entry.isIntersecting), {
      threshold: 0.25,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const errors = useMemo(() => validate(contact), [contact]);
  const isValid = Object.keys(errors).length === 0;
  const vcard = useMemo(() => (isValid ? buildVCard(contact) : ""), [contact, isValid]);
  const name = fullName(contact);
  const phone = contact.phone;

  // Lines under the QR code, shared by the preview, the printout and the PNG.
  const captions: Caption[] = [
    { key: "name", text: name, show: options.showName, primary: true },
    { key: "phone", text: phone, show: options.showPhone },
    { key: "position", text: contact.position.trim(), show: options.showPosition },
    { key: "unit", text: contact.unit.trim(), show: options.showUnit },
    { key: "department", text: contact.department.trim(), show: options.showDepartment },
  ].filter((c) => c.show && c.text);

  const update = (field: keyof Contact) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setContact((c) => ({ ...c, [field]: e.target.value }));
  const touch = (field: keyof Contact) => () => setTouched((t) => ({ ...t, [field]: true }));
  const errorFor = (field: keyof Contact) => (touched[field] ? errors[field] : undefined);

  function requireValid() {
    if (isValid) return true;
    setTouched({ firstName: true, phone: true, workPhone: true, email: true });
    toast.error("Please fill in the required fields first");
    return false;
  }

  /** Compose the QR plus optional caption into a PNG blob. */
  async function renderPng(): Promise<Blob | null> {
    const qr = canvasRef.current;
    if (!qr) return null;
    const lines = captions.map((c) => ({
      text: c.text,
      font: c.primary ? "600 64px system-ui, sans-serif" : "48px system-ui, sans-serif",
    }));

    const pad = 48;
    const lineH = 80;
    const out = document.createElement("canvas");
    out.width = qr.width + pad * 2;
    out.height = qr.height + pad * 2 + (lines.length ? lines.length * lineH + 16 : 0);
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(qr, pad, pad);
    ctx.fillStyle = "#111";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((l, i) => {
      ctx.font = l.font;
      ctx.fillText(l.text, out.width / 2, pad + qr.height + 16 + lineH * i + lineH / 2, out.width - pad * 2);
    });
    return new Promise((resolve) => out.toBlob(resolve, "image/png"));
  }

  const fileName = `${(name || "contact").replace(/[^\w-]+/g, "_")}-qr.png`;

  async function handleDownload() {
    if (!requireValid()) return;
    const blob = await renderPng();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("QR code downloaded");
  }

  function handlePrint() {
    if (!requireValid()) return;
    window.print();
  }

  function setAllShown(show: boolean) {
    setOptions((o) => ({ ...o, ...Object.fromEntries(TOGGLES.map((t) => [t.option, show])) }));
  }

  function handleReset() {
    setContact(emptyContact);
    setTouched({});
    setOptions(defaultOptions);
    toast("Form cleared");
  }

  const field = (
    id: keyof Contact,
    label: string,
    props: React.ComponentProps<typeof Input> & { required?: boolean } = {},
  ) => {
    const err = errorFor(id);
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={id}>
          {label}
          {props.required && <span className="text-destructive">*</span>}
        </Label>
        <Input
          id={id}
          value={contact[id]}
          onChange={update(id)}
          onBlur={touch(id)}
          aria-invalid={!!err}
          aria-describedby={err ? `${id}-error` : undefined}
          className="h-11 text-base md:text-sm"
          {...props}
        />
        {err && (
          <p id={`${id}-error`} className="text-destructive text-xs">
            {err}
          </p>
        )}
      </div>
    );
  };

  const phoneField = (id: PhoneKey, label: string, opts: { required?: boolean; placeholder: string; autoComplete?: string }) => {
    const err = errorFor(id);
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={id}>
          {label}
          {opts.required && <span className="text-destructive">*</span>}
        </Label>
        <PhoneField
          id={id}
          value={contact[id]}
          onChange={(v) => setContact((c) => ({ ...c, [id]: v }))}
          onBlur={touch(id)}
          invalid={!!err}
          describedBy={err ? `${id}-error` : undefined}
          placeholder={opts.placeholder}
          autoComplete={opts.autoComplete}
        />
        {err && (
          <p id={`${id}-error`} className="text-destructive text-xs">
            {err}
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="grid gap-6 print:hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
        {/* ---------- Form ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact details</CardTitle>
            <CardDescription>
              Fields marked <span className="text-destructive">*</span> are required. Everything stays on your
              device.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {field("firstName", "First name", { required: true, autoComplete: "given-name", placeholder: "John" })}
              {field("lastName", "Last name", { autoComplete: "family-name", placeholder: "Doe" })}
            </div>
            {phoneField("phone", "Mobile number", { required: true, autoComplete: "tel", placeholder: "012-345 6789" })}

            {field("position", "Position", { placeholder: "Senior Engineer" })}
            <div className="grid gap-4 sm:grid-cols-2">
              {field("unit", "Unit", { placeholder: "Network Operations" })}
              {field("department", "Department", { placeholder: "IT Department" })}
            </div>
            <p className="text-muted-foreground -mt-1 text-xs">
              Position, unit and department are saved together as the contact&apos;s job title.
            </p>

            <button
              type="button"
              onClick={() => setShowMore((s) => !s)}
              aria-expanded={showMore}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 justify-self-start py-1 text-sm font-medium transition-colors"
            >
              <ChevronDownIcon className={cn("size-4 transition-transform", showMore && "rotate-180")} />
              {showMore ? "Hide extra details" : "Add email, company, address…"}
            </button>

            {showMore && (
              <div className="animate-in fade-in slide-in-from-top-2 grid gap-4 duration-200">
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  {field("email", "Email", {
                    type: "email",
                    inputMode: "email",
                    autoComplete: "email",
                    placeholder: "johndoe@example.com",
                  })}
                  {phoneField("workPhone", "Work phone", { placeholder: "03-1234 5678" })}
                  {field("organization", "Company", { autoComplete: "organization", placeholder: "Acme Inc." })}
                </div>
                {field("website", "Website", { type: "url", inputMode: "url", placeholder: "johndoe.com" })}
                {field("street", "Street address", { autoComplete: "street-address", placeholder: "123 Main Street" })}
                <div className="grid grid-cols-2 gap-4">
                  {field("city", "City", { autoComplete: "address-level2" })}
                  {field("region", "State", { autoComplete: "address-level1" })}
                  {field("postcode", "Postcode", { autoComplete: "postal-code", inputMode: "numeric" })}
                  {field("country", "Country", { autoComplete: "country-name" })}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="note">Note</Label>
                  <Textarea
                    id="note"
                    value={contact.note}
                    onChange={update("note")}
                    placeholder="Met at the 2026 expo"
                    className="min-h-20 text-base md:text-sm"
                  />
                </div>
              </div>
            )}

            <Separator />
            <Button variant="ghost" className="text-muted-foreground justify-self-start" onClick={handleReset}>
              <RotateCcwIcon />
              Clear form
            </Button>
          </CardContent>
        </Card>

        {/* ---------- Preview & options ---------- */}
        <div ref={previewRef} className="grid scroll-mt-20 gap-6 lg:sticky lg:top-20">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your QR code</CardTitle>
              <CardDescription>Scan with a phone camera to save the contact.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="bg-muted/50 flex justify-center rounded-xl p-4 sm:p-6">
                <div
                  className={cn(
                    "flex w-full max-w-64 flex-col items-center gap-2 rounded-lg bg-white p-4 text-neutral-900 shadow-sm transition-all duration-300",
                    !isValid && "opacity-60",
                  )}
                >
                  {isValid ? (
                    <QRCodeSVG
                      value={vcard}
                      level="M"
                      marginSize={0}
                      title={`Contact QR code for ${name}`}
                      className="animate-in fade-in zoom-in-95 aspect-square h-auto w-full duration-300"
                    />
                  ) : (
                    <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-neutral-300 p-4 text-center text-neutral-500">
                      <QrCodeIcon className="size-10" />
                      <p className="text-xs">Enter a name and mobile number to generate your QR code</p>
                    </div>
                  )}
                  {captions.map((c) => (
                    <p
                      key={c.key}
                      className={cn(
                        "w-full text-center leading-tight break-words",
                        c.primary ? "text-base font-semibold" : "text-sm text-neutral-600",
                      )}
                    >
                      {c.text}
                    </p>
                  ))}
                </div>
              </div>

              <div className="grid gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>Show under QR code</Label>
                  <div className="flex items-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setAllShown(true)}
                      className="text-muted-foreground hover:text-foreground rounded px-1.5 py-1 font-medium transition-colors"
                    >
                      All
                    </button>
                    <span className="text-muted-foreground/50">·</span>
                    <button
                      type="button"
                      onClick={() => setAllShown(false)}
                      className="text-muted-foreground hover:text-foreground rounded px-1.5 py-1 font-medium transition-colors"
                    >
                      QR only
                    </button>
                  </div>
                </div>
                <ToggleGroup
                  multiple
                  variant="outline"
                  spacing={2}
                  className="w-full flex-wrap"
                  value={TOGGLES.filter((t) => options[t.option]).map((t) => t.option)}
                  onValueChange={(shown: string[]) =>
                    setOptions((o) => ({
                      ...o,
                      ...Object.fromEntries(TOGGLES.map((t) => [t.option, shown.includes(t.option)])),
                    }))
                  }
                >
                  {TOGGLES.map(({ option, label, icon: Icon }) => {
                    const on = options[option];
                    return (
                      <ToggleGroupItem
                        key={option}
                        value={option}
                        aria-label={`${on ? "Hide" : "Show"} ${label.toLowerCase()}`}
                        className={cn(
                          "h-9 rounded-full! border px-3 transition-all active:scale-95",
                          "aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90 aria-pressed:hover:text-primary-foreground",
                        )}
                      >
                        {on ? <CheckIcon className="animate-in zoom-in-50 duration-150" /> : <Icon />}
                        {label}
                      </ToggleGroupItem>
                    );
                  })}
                </ToggleGroup>
              </div>

              <Separator />

              <div className="grid gap-2">
                <Label>Print size</Label>
                <ToggleGroup
                  variant="outline"
                  spacing={0}
                  className="w-full"
                  value={[options.size]}
                  onValueChange={(v) => v[0] && setOptions((o) => ({ ...o, size: v[0] as PrintSize }))}
                >
                  {(Object.keys(PRINT_MM) as PrintSize[]).map((s) => (
                    <ToggleGroupItem key={s} value={s} className="h-10 flex-1 capitalize">
                      {s}
                      <span className="text-muted-foreground text-xs">{PRINT_MM[s] / 10}cm</span>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="grid gap-2 pt-1">
                <Button size="lg" className="h-12 text-base" onClick={handlePrint} disabled={!isValid}>
                  <PrinterIcon />
                  Print
                </Button>
                <Button variant="outline" size="lg" className="h-11" onClick={handleDownload} disabled={!isValid}>
                  <DownloadIcon />
                  Download PNG
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile shortcut to jump to the preview once the QR is ready */}
      {isValid && !previewVisible && (
        <div className="animate-in slide-in-from-bottom-4 fade-in fixed inset-x-0 bottom-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] print:hidden lg:hidden">
          <Button
            size="lg"
            className="h-12 w-full text-base shadow-lg"
            onClick={() => previewRef.current?.scrollIntoView({ behavior: "smooth" })}
          >
            <EyeIcon />
            View QR code
          </Button>
        </div>
      )}

      {/* High-resolution canvas used for the PNG download */}
      {isValid && (
        <div className="hidden" aria-hidden>
          <QRCodeCanvas ref={canvasRef} value={vcard} level="M" size={1024} marginSize={2} />
        </div>
      )}

      {/* Print-only layout */}
      {isValid && (
        // Fixed + inset-0 fills the printable area, so the label sits in the middle of the page.
        <div className="hidden print:fixed print:inset-0 print:flex print:items-center print:justify-center">
          <div>
            <div
              className="flex flex-col items-center gap-[2mm] p-[4mm] text-black"
              style={{ width: `${PRINT_MM[options.size] + 8}mm` }}
            >
              <QRCodeSVG
                value={vcard}
                level="M"
                marginSize={0}
                style={{ width: `${PRINT_MM[options.size]}mm`, height: `${PRINT_MM[options.size]}mm` }}
              />
              {captions.map((c) => (
                <p
                  key={c.key}
                  className={cn("w-full text-center leading-tight break-words", c.primary && "font-semibold")}
                  style={{
                    fontSize: `${c.primary ? Math.max(9, PRINT_MM[options.size] / 4.5) : Math.max(8, PRINT_MM[options.size] / 6)}pt`,
                  }}
                >
                  {c.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
