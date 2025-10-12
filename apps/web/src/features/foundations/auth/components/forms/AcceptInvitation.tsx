"use client";

import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { errorToast } from "@/features/common/components/errors/errorToast";
import FormPassword from "@/features/common/components/forms/FormPassword";
import { useAuthContext } from "@/features/foundations/auth/contexts/AuthContext";
import { AuthService } from "@/features/foundations/auth/data/AuthService";
import { AuthComponent } from "@/features/foundations/auth/enums/AuthComponent";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

export default function AcceptInvitation() {
  const { setComponentType, params, setParams } = useAuthContext();
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const t = useTranslations();

  useEffect(() => {
    async function validateCode(code: string) {
      try {
        const payload: any = {
          code: code,
        };

        await AuthService.validateCode(payload);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        errorToast({ title: t(`generic.errors.error`), error: e });
      }
    }

    if (params && params.code) {
      validateCode(params.code);
    } else {
      setError(t(`foundations.auth.errors.invalid_invitation_code`));
    }
  }, []);

  const formSchema = z
    .object({
      password: z.string().min(1, {
        message: t(`foundations.user.fields.password.error`),
      }),
      passwordRetype: z.string().min(1, {
        message: t("foundations.auth.errors.password_retype_required"),
      }),
    })
    .refine((data) => data.password === data.passwordRetype, {
      message: t("foundations.auth.errors.password_does_not_match"),
      path: ["passwordRetype"],
    });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      passwordRetype: "",
    },
  });

  const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = async (values: z.infer<typeof formSchema>) => {
    try {
      if (!params?.code) return;

      const payload = {
        code: params?.code,
        password: values.password,
      };

      await AuthService.acceptInvitation(payload);
      setShowConfirmation(true);

      toast.success(t("foundations.auth.account_activated"), {
        description: t("foundations.auth.account_activated_description"),
      });

      setTimeout(() => {
        setComponentType(AuthComponent.Login);
        setParams(undefined);
      }, 2000);
    } catch (e) {
      errorToast({ title: t(`generic.errors.error`), error });
    }
  };

  return (
    <>
      <CardHeader>
        <CardTitle className="text-primary flex flex-col items-center pb-10 text-4xl">
          <Image src="/logo.webp" alt="Asset2Go" width={100} height={100} priority />
          {t("foundations.auth.accept_invitation")}
        </CardTitle>
        <CardDescription className="text-center text-sm">
          {error ? (
            <>{t("foundations.auth.errors.activating_account")}</>
          ) : (
            <>{t("foundations.auth.select_password")}</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showConfirmation ? (
          <CardDescription className="text-center text-xl">
            {t("foundations.auth.activation_description")}
          </CardDescription>
        ) : error ? (
          <CardDescription className="text-center text-xl">{error}</CardDescription>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FormPassword
                form={form}
                id="password"
                name={t(`foundations.user.fields.password.label`)}
                placeholder={t(`foundations.user.fields.password.placeholder`)}
              />
              <FormPassword
                form={form}
                id="passwordRetype"
                name={t("foundations.auth.fields.retype_password.label")}
                placeholder={t(`foundations.auth.fields.retype_password.placeholder`)}
              />
              <Button className="mt-4 w-full" type={"submit"}>
                {t("foundations.auth.accept_invitation")}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </>
  );
}
