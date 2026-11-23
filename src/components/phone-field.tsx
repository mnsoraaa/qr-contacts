"use client";

import PhoneInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";

import { cn } from "@/lib/utils";
import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES } from "@/lib/vcard";

/** Borderless input; the border and focus ring live on the wrapper so the flag sits inside the box. */
function BareInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn("placeholder:text-muted-foreground h-full min-w-0 flex-1 bg-transparent outline-none", className)}
      {...props}
    />
  );
}

type PhoneFieldProps = {
  id: string;
  /** E.164, e.g. "+60123456789", or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
  autoComplete?: string;
};

/** Phone number with a Malaysia / Singapore flag picker, built on react-phone-number-input. */
export function PhoneField({ id, value, onChange, onBlur, invalid, describedBy, ...rest }: PhoneFieldProps) {
  return (
    <PhoneInput
      id={id}
      value={value || undefined}
      onChange={(v) => onChange(v ?? "")}
      onBlur={onBlur}
      countries={PHONE_COUNTRIES}
      defaultCountry={DEFAULT_PHONE_COUNTRY}
      addInternationalOption={false}
      flags={flags}
      inputComponent={BareInput}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={cn(
        "border-input dark:bg-input/30 flex h-11 w-full items-center gap-2 rounded-lg border bg-transparent px-3 text-base transition-colors md:text-sm",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-3",
        invalid && "border-destructive ring-destructive/20 dark:border-destructive/50 ring-3",
      )}
      {...rest}
    />
  );
}
