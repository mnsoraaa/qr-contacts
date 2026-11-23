import Image from "next/image";
import { ContactQrGeneratorClient } from "@/components/contact-qr-generator-client";
import { InstallButton } from "@/components/install-button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <>
      <header className="bg-background/80 sticky top-0 z-30 border-b pt-[env(safe-area-inset-top)] backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Image src="/icons/icon.svg" alt="" width={32} height={32} className="rounded-lg" priority />
          <span className="font-semibold tracking-tight">QR Contacts</span>
          <div className="ml-auto flex items-center gap-1">
            <InstallButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:pt-10 lg:pb-12 print:max-w-none print:p-0">
        <section className="mb-6 max-w-2xl sm:mb-8 print:hidden">
          <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-4xl">
            Turn your contact into a QR code
          </h1>
          <p className="text-muted-foreground mt-2 text-pretty sm:text-lg">
            Anyone can scan it with their phone camera and save you to their contacts in one tap. Print it or download
            it.
          </p>
        </section>
        <ContactQrGeneratorClient />
      </main>

      <footer className="text-muted-foreground px-4 pb-8 text-center text-xs print:hidden">
        Your details are processed in your browser and never uploaded.
      </footer>
    </>
  );
}
