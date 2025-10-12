"use client";

import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { errorToast } from "@/features/common/components/errors/errorToast";
import FormInput from "@/features/common/components/forms/FormInput";
import FormPassword from "@/features/common/components/forms/FormPassword";
import { useAuthContext } from "@/features/foundations/auth/contexts/AuthContext";
import { AuthService } from "@/features/foundations/auth/data/AuthService";
import { AuthComponent } from "@/features/foundations/auth/enums/AuthComponent";
import { useCurrentUserContext } from "@/features/foundations/user/contexts/CurrentUserContext";
import { UserInterface } from "@/features/foundations/user/data/UserInterface";
import { usePageUrlGenerator } from "@/hooks/usePageUrlGenerator";

import { Link, useRouter } from "@/i18n/routing";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

export default function Login() {
  const t = useTranslations();
  const { setUser } = useCurrentUserContext();
  const { setComponentType } = useAuthContext();
  const generateUrl = usePageUrlGenerator();
  const router = useRouter();

  const formSchema = z.object({
    email: z.string().email({
      message: t(`generic.errors.invalid_email`),
    }),
    password: z.string().min(3, { message: t(`foundations.auth.errors.password_too_short`) }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = async (values: z.infer<typeof formSchema>) => {
    try {
      const user: UserInterface = await AuthService.login({
        email: values.email,
        password: values.password,
      });

      setUser(user);
      router.replace(generateUrl({ page: `/` }));
    } catch (e) {
      errorToast({
        title: t(`generic.errors.error`),
        error: e,
      });
    }
  };

  return (
    <>
      <CardHeader data-testid="page-login-container">
        <CardTitle className="text-primary flex flex-col items-center pb-10 text-4xl">
          <Image src="/logo.webp" alt="Asset2Go" width={100} height={100} priority />
          {t("foundations.auth.login")}
        </CardTitle>

        <CardDescription className="text-sm">{t(`foundations.auth.login_description`)}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            <FormInput
              autoFocus
              form={form}
              id="email"
              name={t(`foundations.user.fields.email.label`)}
              placeholder={t(`foundations.user.fields.email.placeholder`)}
              testId="form-login-input-email"
            />
            <FormPassword
              form={form}
              id="password"
              name={t(`foundations.user.fields.password.label`)}
              placeholder={t(`foundations.user.fields.password.placeholder`)}
              testId="form-login-input-password"
            />
            <Button className="mt-4 w-full" type={"submit"} data-testid="form-login-button-submit">
              {t(`foundations.auth.login`)}
            </Button>
          </CardContent>
          <CardFooter className="flex w-full flex-row justify-between">
            <Link
              href="#"
              className="flex w-full justify-start"
              onClick={() => setComponentType(AuthComponent.Register)}
            >
              {t(`foundations.auth.register`)}
            </Link>
            <Link
              href="#"
              className="flex w-full justify-end"
              onClick={() => setComponentType(AuthComponent.ForgotPassword)}
              data-testid="form-login-link-forgot-password"
            >
              {t(`foundations.auth.forgot_password`)}
            </Link>
          </CardFooter>
        </form>
      </Form>
    </>
  );
}
