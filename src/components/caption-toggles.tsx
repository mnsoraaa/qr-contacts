"use client";

import { BriefcaseIcon, Building2Icon, CheckIcon, LayersIcon, PhoneIcon, UserIcon, type LucideIcon } from "lucide-react";

import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ShowOption, ShowOptions } from "@/lib/qr-label";
import { cn } from "@/lib/utils";

/** Label lines the user can show or hide, in the order they appear under the QR code. */
const TOGGLES: { option: ShowOption; label: string; icon: LucideIcon }[] = [
  { option: "showName", label: "Name", icon: UserIcon },
  { option: "showPhone", label: "Phone", icon: PhoneIcon },
  { option: "showPosition", label: "Position", icon: BriefcaseIcon },
  { option: "showUnit", label: "Unit", icon: LayersIcon },
  { option: "showDepartment", label: "Department", icon: Building2Icon },
];

const allSetTo = (show: boolean) => Object.fromEntries(TOGGLES.map((t) => [t.option, show])) as ShowOptions;

/** "Show under QR code" chips, shared by the single and bulk generators. */
export function CaptionToggles({ value, onChange }: { value: ShowOptions; onChange: (next: ShowOptions) => void }) {
  return (
    <div className="grid gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <Label>Show under QR code</Label>
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => onChange(allSetTo(true))}
            className="text-muted-foreground hover:text-foreground rounded px-1.5 py-1 font-medium transition-colors"
          >
            All
          </button>
          <span className="text-muted-foreground/50">·</span>
          <button
            type="button"
            onClick={() => onChange(allSetTo(false))}
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
        value={TOGGLES.filter((t) => value[t.option]).map((t) => t.option)}
        onValueChange={(shown: string[]) =>
          onChange(Object.fromEntries(TOGGLES.map((t) => [t.option, shown.includes(t.option)])) as ShowOptions)
        }
      >
        {TOGGLES.map(({ option, label, icon: Icon }) => {
          const on = value[option];
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
  );
}
