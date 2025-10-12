"use client";

import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { errorToast } from "@/features/common/components/errors/errorToast";
import FormInput from "@/features/common/components/forms/FormInput";
import { useAuthContext } from "@/features/foundations/auth/contexts/AuthContext";
import { AuthService } from "@/features/foundations/auth/data/AuthService";
import { AuthComponent } from "@/features/foundations/auth/enums/AuthComponent";

import { Link } from "@/components/custom-ui/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

export default function ForgotPassword() {
  const t = useTranslations();
  const { setComponentType } = useAuthContext();

  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);

  const formSchema = z.object({
    email: z.string().email({
      message: t(`generic.errors.invalid_email`),
    }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = async (values: z.infer<typeof formSchema>) => {
    try {
      const payload = {
        email: values.email,
      };

      await AuthService.initialiseForgotPassword(payload);
      setShowConfirmation(true);
    } catch (e) {
      errorToast({ error: e });
    }
  };

  return (
    <>
      <CardHeader data-testid="page-forgot-password-container">
        <CardTitle className="text-primary flex flex-col items-center pb-10 text-4xl">
          <Image src="/logo.webp" alt="Asset2Go" width={100} height={100} priority />
          {t("foundations.auth.forgot_password")}
        </CardTitle>
        <CardDescription className="text-sm">
          {showConfirmation ? <> </> : <>{t(`foundations.auth.add_email_to_reset`)}</>}
        </CardDescription>
      </CardHeader>
      {showConfirmation ? (
        <CardContent>
          <CardDescription className="text-center text-xl">{t(`foundations.auth.reset_confirmation`)}</CardDescription>
        </CardContent>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent>
              <FormInput
                form={form}
                id="email"
                name={t(`foundations.user.fields.email.label`)}
                placeholder={t(`foundations.user.fields.email.placeholder`)}
                testId="form-forgot-password-input-email"
              />
              <Button className="mt-4 w-full" type={"submit"} data-testid="form-forgot-password-button-reset">
                {t(`foundations.auth.buttons.reset_password`)}
              </Button>
            </CardContent>
            <CardFooter className="flex w-full flex-row justify-between">
              {/* <Link
                href="#"
                className="flex w-full justify-start"
                onClick={() => setComponentType(AuthComponent.Register)}
              >
                {t("foundations.auth.buttons.register")}
              </Link> */}
              <Link
                href="#"
                className="flex w-full justify-end"
                onClick={() => setComponentType(AuthComponent.Login)}
                data-testid="form-forgot-password-link-login"
              >
                {t(`foundations.auth.buttons.login`)}
              </Link>
            </CardFooter>
          </form>
        </Form>
      )}
    </>
  );
}
