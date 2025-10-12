"use client";

import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { errorToast } from "@/features/common/components/errors/errorToast";
import { useAuthContext } from "@/features/foundations/auth/contexts/AuthContext";
import { AuthService } from "@/features/foundations/auth/data/AuthService";
import { AuthComponent } from "@/features/foundations/auth/enums/AuthComponent";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function ActivateAccount() {
  const { setComponentType, params, setParams } = useAuthContext();
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const t = useTranslations();

  useEffect(() => {
    async function ActivateAccount(code: string) {
      try {
        const payload = {
          activationCode: code,
        };

        await AuthService.activate(payload);
        setShowConfirmation(true);

        setParams(undefined);

        toast.success(t("foundations.auth.account_activated"), {
          description: t("foundations.auth.account_activated_description"),
        });

        setTimeout(() => {
          setComponentType(AuthComponent.Login);
        }, 2000);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        errorToast({ title: t(`generic.errors.error`), error: e });
      }
    }

    if (params && params.code) {
      ActivateAccount(params.code);
    } else {
      setError(t(`foundations.auth.errors.invalid_invitation_code`));
    }
  }, []);

  return (
    <>
      <CardHeader>
        <CardTitle className="text-primary flex flex-col items-center pb-10 text-4xl">
          <Image src="/logo.webp" alt="Asset2Go" width={100} height={100} priority />
          {t("foundations.auth.accept_invitation")}
        </CardTitle>
        <CardDescription className="text-center text-sm">
          {error ? <>{t("foundations.auth.errors.activating_account")}</> : <> </>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-center text-xl">
          {showConfirmation ? (
            <>{t("foundations.auth.activation_description")}</>
          ) : error ? (
            <>{error}</>
          ) : (
            <>{t("foundations.auth.activation_wait")}</>
          )}
        </CardDescription>
      </CardContent>
    </>
  );
}
