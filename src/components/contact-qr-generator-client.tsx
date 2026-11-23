"use client";

import dynamic from "next/dynamic";

/** The generator reads localStorage on first render, so it only renders in the browser. */
export const ContactQrGeneratorClient = dynamic(
  () => import("@/components/contact-qr-generator").then((m) => m.ContactQrGenerator),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="bg-muted h-80 animate-pulse rounded-xl" />
        <div className="bg-muted h-[34rem] animate-pulse rounded-xl" />
      </div>
    ),
  },
);
