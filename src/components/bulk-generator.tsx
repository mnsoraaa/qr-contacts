"use client";

import { useRef, useState } from "react";
import { zipSync, type Zippable } from "fflate";
import { AlertTriangleIcon, CheckCircle2Icon, FileDownIcon, FileSpreadsheetIcon, FolderArchiveIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { CaptionToggles } from "@/components/caption-toggles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { importContacts, templateCsv, type ImportResult } from "@/lib/bulk-import";
import {
  buildCaptions,
  defaultShowOptions,
  downloadBlob,
  fileBaseName,
  renderLabelPng,
  type ShowOptions,
} from "@/lib/qr-label";
import { cn } from "@/lib/utils";
import { buildVCard, fullName } from "@/lib/vcard";

const ACCEPT = ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Upload a CSV/.xlsx of contacts and download one QR code PNG per valid row, as a zip. */
export function BulkGenerator() {
  const [show, setShow] = useState<ShowOptions>(defaultShowOptions);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      setError("Please choose a .csv or .xlsx file.");
      return;
    }
    setFileName(file.name);
    setError(null);
    setResult(null);
    setReading(true);
    try {
      setResult(await importContacts(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this file.");
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = ""; // Allow re-uploading the same file after fixing it.
    }
  }

  async function handleGenerate() {
    if (!result?.valid.length) return;
    const total = result.valid.length;
    const files: Zippable = {};
    const used = new Set<string>();
    setProgress({ done: 0, total });
    try {
      for (const [i, { contact }] of result.valid.entries()) {
        const blob = await renderLabelPng(buildVCard(contact), buildCaptions(contact, show));
        // Same name twice → "John_Doe-qr.png", "John_Doe-2-qr.png", …
        const base = fileBaseName(fullName(contact));
        let name = `${base}-qr.png`;
        for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base}-${n}-qr.png`;
        used.add(name.toLowerCase());
        files[name] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }]; // PNGs are already compressed.
        setProgress({ done: i + 1, total });
      }
      const zip = zipSync(files);
      downloadBlob(new Blob([zip as BlobPart], { type: "application/zip" }), "qr-codes.zip");
      toast.success(`Downloaded ${total} QR code${total === 1 ? "" : "s"}`);
    } catch {
      toast.error("Could not create the zip file");
    } finally {
      setProgress(null);
    }
  }

  const ready = result?.valid.length ?? 0;
  const skipped = result?.invalid.length ?? 0;
  const busy = reading || !!progress;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
      {/* ---------- Upload & results ---------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload contacts</CardTitle>
          <CardDescription>
            One row per person. The file is read in your browser and never uploaded.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <p className="text-sm font-medium">1. Fill in the template</p>
            <Button variant="outline" className="justify-self-start" onClick={() => downloadBlob(templateCsv(), "qr-contacts-template.csv")}>
              <FileDownIcon />
              Download CSV template
            </Button>
            <p className="text-muted-foreground text-xs">
              First name and Mobile are required. In Excel, format the Mobile and Work phone columns as <b>Text</b>{" "}
              before typing, so numbers keep their + and leading 0. Save as <b>CSV UTF-8</b> or <b>.xlsx</b>. Use +65 for
              Singapore numbers.
            </p>
          </div>

          <div className="grid gap-2">
            <p className="text-sm font-medium">2. Upload it</p>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFile(e.dataTransfer.files[0]);
              }}
              className={cn(
                "hover:bg-muted/50 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                dragging && "border-primary bg-muted/50",
                busy && "pointer-events-none opacity-60",
              )}
            >
              <UploadIcon className="text-muted-foreground size-8" />
              <span className="text-sm font-medium">{reading ? "Reading…" : "Choose a file or drag it here"}</span>
              <span className="text-muted-foreground text-xs">{fileName ?? ".csv or .xlsx"}</span>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </label>
            {error && (
              <p className="text-destructive flex items-start gap-1.5 text-sm">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            )}
          </div>

          {result && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2Icon className="size-4 text-green-600" />
                  <b>{ready}</b> ready
                </span>
                <span className={cn("flex items-center gap-1.5", skipped ? "text-destructive" : "text-muted-foreground")}>
                  <AlertTriangleIcon className="size-4" />
                  <b>{skipped}</b> skipped
                </span>
              </div>

              {skipped > 0 && (
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Skipped rows</p>
                  <p className="text-muted-foreground text-xs">
                    These rows won&apos;t be in the zip. Fix them in your spreadsheet and upload it again to include them.
                  </p>
                  <div className="max-h-96 overflow-auto rounded-lg border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="px-3 py-2 font-medium">Row</th>
                          <th className="px-3 py-2 font-medium">Name</th>
                          <th className="px-3 py-2 font-medium">Problem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.invalid.map((r) => (
                          <tr key={r.row} className="border-t align-top">
                            <td className="text-muted-foreground px-3 py-2 tabular-nums">{r.row}</td>
                            <td className="px-3 py-2">{r.name || <span className="text-muted-foreground">—</span>}</td>
                            <td className="px-3 py-2">
                              <ul className="grid gap-0.5">
                                {r.problems.map((p) => (
                                  <li key={p}>{p}</li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ---------- Options & download ---------- */}
      <div className="grid gap-6 lg:sticky lg:top-20">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your QR codes</CardTitle>
            <CardDescription>One PNG per person, the same as the single download.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <CaptionToggles value={show} onChange={setShow} />
            <Separator />
            <div className="grid gap-2">
              <Button size="lg" className="h-12 text-base" onClick={handleGenerate} disabled={!ready || busy}>
                <FolderArchiveIcon />
                {progress
                  ? `Generating ${progress.done} of ${progress.total}…`
                  : ready
                    ? `Download ZIP (${ready} QR code${ready === 1 ? "" : "s"})`
                    : "Download ZIP"}
              </Button>
              {progress && (
                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full transition-[width]"
                    style={{ width: `${(progress.done / progress.total) * 100}%` }}
                  />
                </div>
              )}
              {!result && (
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <FileSpreadsheetIcon className="size-3.5" />
                  Upload a file to get started.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
