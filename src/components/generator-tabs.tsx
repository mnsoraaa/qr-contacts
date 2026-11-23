"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { UserIcon, UsersIcon } from "lucide-react";

import { ContactQrGeneratorClient } from "@/components/contact-qr-generator-client";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/** Loaded only when the Bulk tab is opened, so single-contact users don't download the spreadsheet libraries. */
const BulkGenerator = dynamic(() => import("@/components/bulk-generator").then((m) => m.BulkGenerator), {
  ssr: false,
  loading: () => <div className="bg-muted h-96 animate-pulse rounded-xl" />,
});

type Mode = "single" | "bulk";

export function GeneratorTabs() {
  const [mode, setMode] = useState<Mode>("single");
  return (
    <div className="grid gap-6">
      <ToggleGroup
        variant="outline"
        spacing={0}
        className="print:hidden"
        value={[mode]}
        onValueChange={(v) => v[0] && setMode(v[0] as Mode)}
      >
        <ToggleGroupItem value="single" className="h-10 px-4">
          <UserIcon />
          Single
        </ToggleGroupItem>
        <ToggleGroupItem value="bulk" className="h-10 px-4">
          <UsersIcon />
          Bulk (CSV / Excel)
        </ToggleGroupItem>
      </ToggleGroup>
      {mode === "single" ? <ContactQrGeneratorClient /> : <BulkGenerator />}
    </div>
  );
}
