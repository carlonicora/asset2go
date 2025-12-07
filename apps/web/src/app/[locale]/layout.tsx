import { CurrentUserProvider } from "@/features/foundations/user/contexts/CurrentUserContext";
import { Provider } from "jotai";
import "react-horizontal-scrolling-menu/dist/styles.css";

import { FaroProvider } from "@/components/providers/FaroProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { Toaster } from "sonner";
import "../globals.css";

const fontSans = Inter({ subsets: ["latin"], weight: ["100", "300", "400", "700"], variable: "--font-sans" });

export default async function RootLayout(props: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const params = await props.params;

  const { locale } = params;
  const { children } = props;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html suppressHydrationWarning lang={locale}>
      <body className={cn("bg-background !top-0 min-h-screen font-sans antialiased", fontSans.variable)}>
        <FaroProvider>
          <Provider>
            <NextIntlClientProvider messages={messages}>
              <CurrentUserProvider>
                <TooltipProvider>
                  <Toaster closeButton richColors />
                  {children}
                </TooltipProvider>
              </CurrentUserProvider>
            </NextIntlClientProvider>
          </Provider>
        </FaroProvider>
      </body>
    </html>
  );
}
