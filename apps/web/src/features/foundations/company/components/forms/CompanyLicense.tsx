"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorToast } from "@/features/common/components/errors/errorToast";
import FormInput from "@/features/common/components/forms/FormInput";
import FormTextarea from "@/features/common/components/forms/FormTextarea";
import { updateToken } from "@/features/foundations/auth/utils/AuthCookies";
import { CompanyInput } from "@/features/foundations/company/data/CompanyInterface";
import { CompanyService } from "@/features/foundations/company/data/CompanyService";
import { useCurrentUserContext } from "@/features/foundations/user/contexts/CurrentUserContext";
import { UserService } from "@/features/foundations/user/data/UserService";
import { usePageUrlGenerator } from "@/hooks/usePageUrlGenerator";
import { Link, useRouter } from "@/i18n/routing";
import { revalidatePaths } from "@/lib/PageRevalidation";
import { Modules } from "@/modules/modules";
import { AuthRole } from "@/permisions/enums/AuthRole";
import { zodResolver } from "@hookform/resolvers/zod";
import { deleteCookie } from "cookies-next";
import { ClipboardIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

export default function CompanyLicense() {
  const { currentUser, setUser, hasRole } = useCurrentUserContext();

  const t = useTranslations();
  const generateUrl = usePageUrlGenerator();
  const router = useRouter();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  };

  const formSchema = z.object({
    license: z.string().min(1, {
      message: `License is required`,
    }),
    privateKey: z.string().min(1, {
      message: `Private key is required`,
    }),
  });

  const defaultValues = {
    license:
      "09001678dca2f4a6d2d32bb984811278:3e93a432f6130579e543a511346c0d2c6ca7a97d49c7ff2d3e789ca7c7c8d79b864fd3406c8315e72aa5febf6232776dfaea51d72168ddcdd34a59ea1a05b3b3dd60ac3af6c3934203d19ea68642293aa5b79f012633b4ba2e4a474e9ceed6b6cda13d8dedc8e60ece61886843ee6edc1af6d2da5e07945033295507df6f87994f8347b5759b446aa20b1185d7b5c54c67509ae280e729913d0e68e95b5f090b0577a8a735f24fb7c1df8f6586886d840af4a43f9dc74d5d1f291058a45ace759176fa19fe5e164f5d8307981e8bcd166f346e97b676dd0242d1c30ec4fe744f22621fae603b1caaac25f198d2b29be0e0f2afc81a40edeb20242345e2feac8666027d0c30aa8dadbca742dd68ade46602545979f473b344021d27921553d5b284fd96a717b74573ca7e693723876357013e3c0d07a35d270a0e32654d2c244220e2492380279aa34a4744d145b89d06a8abef49cc2ef0dd0171e0eefcf16724decf53e545d10d9bfd8e0c4b03ca720b0fc63d8a20ca2c71d74cb0cf7e547637dbcc8d27257414b5b0b40eabe9eb53a4b5f61ca2250d5933a13565f785a89fc5e3e3c468acbeddf14627aa4109f32af641fc96513e52edc21849e81331cafc900ea85f58927d583aafe5a959af69ce5c967d0cd5d9050cf6601a615e8e3ccf32e6a04227f1f228d94f9bd24073c7b0ec2550f4efc69bddde745144dcb279864fb3e7e7d57d1e96d0701b55f0d6f3bd688880e4a78adb0974cba278cd34bc02753e8a736a4b3a4e48afdf206b9330fee4e29a3c28dec8457e0f44adc10735c1d1992b798e0dd710053ce98ff38b6ff59004079a5face769950401b49fdc13e4cd3324d7df2cf0f40593f51c117debbafd",
    privateKey:
      "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCKDXrjEXBcYx6p\nChtixITGiFqZeaurD3n2SeJl8QuniKlbl7ytC71gS9BzIG5Q/ENhAE41qa7FaHdN\nHLQ2anfAjS/wd/41wx9ilvQeN/IcDb5Dx3Qd07OMLdrgDvkhlUPSvt7Y5/yft1IX\nS8NaDrKoO4zjpVB9SeLYGyFXmfP0ciJ97AkWDfXp3l2WjwwxEQByo5uXOMzpEZla\nkqBFy7kkO3c/SJWqnuXbXrUVr7AjZ9zMCPP/NbvvOkGzovrOYHN5WO9Rg7m+wIFK\n+gTL2e3RnyjUUSoX5/NMZO9oyDNEaaWgIv6LOG72A2Xq55gpNQihjltZWd/o+xFb\nIRZzbmllAgMBAAECggEABrrvgcBo5OgkJ4OJoEAKZQ9is1a+KsG/ZWVmtyeQNOOx\ntfhox1rqKZaom+Q53JLfygvUxEL4dUFJh6Xdl0WLfwSjEKsY5pATqJ/JWOvLTtjQ\nrMc9fvLCLxRRNlkkhiGbw9twS8zLgRHT27Ti2jIbPZ5hmPuHOARxHa386yNjREh1\n14Vlhk+dvhmqtYt11AKWuU8nHuf92wCCetATUg/pfNQ1itf6XDlygUZTl4GkoJg/\nVrt1MnsrTKcGzP+gvpNH0aOuUbgtUWtBIKaSuGgY6lMMny6AApeJ+kXZR8cyPVSi\nYm/185AcxQDlPunoyl3QzvV41zJUccoMI576wFTUQQKBgQC8QQtNXjfcQvYDeVv8\ntWKAxgk+OE6/3ntLkbYxPw2H5IOikhb5OjNirzUzRs4CKjnGhx0zDzCi4TV2xwZf\nwDHpd9VEhEXmKBJe43RCQs0vb1jwz4ttRk9eoz1Oa4cNij3yH5F4oNu5ZnOSZWi/\n1c4mIsGjjTWzeOkJ6J+fCc6ztQKBgQC7u53nuvMubVhNW3FyuHaXuE+nUlNaw2gc\n9mhm17DY+MBf2YqdJOCY1B44WMIZe3k/75qXrZEYG4ikdlAGzrh7q3/8GMKCxk8P\n5y+YeKODdURM1SsUoOqAzga7s2vFxnChtWxk3KfXCzjKUoX/9zWX/zfIAl9VsVVC\nhrARyffM8QKBgC6pIJgIpmfd4QRzbC1y9/tbGqdlZX+BMaZFc5c5Pa1VIpuFAlS7\n7EiljNYs0psOxEtE6iPhu/hjQdEy+414IebwYNgewQSPIh6K2iIiVKFRRAZMKw7m\nwn1+kI+Db3IXtcrxsCjqFgwaLMM4h4IlCHfDXaOgOJNHgNuH4SiWUbmRAoGAUGD4\nLuugi1RN5nEslc3dGQDVOfLJtabMwPnPoZjgI0X+OAvQiY/sigLoHYADOx3ewD06\nl468/PFtA92UThXcbzbyyWFghtWZrFlzy3h7qiFfaPYsR9zOCvAredpMXpWkS9h9\n3IGNa0lmu1mx/fI+hCHGJGC/qNUQiDda04MCEkECgYAxDhQW7sRox+7Pn0TsRotN\nTv6AJggyTjBaF45fVy+28sn53f/9HE++Rxn8W5xQl+hEOywT95OcWB9b4CiZsp1P\nZyjkByeUuraVM1DoFh66UdXUvC2FECdyz4N3JyKHvV82GdrTPsQLVPCsGfzkj7V8\nX+iuQoeEbUvwnnrg3pbClQ==\n-----END PRIVATE KEY-----\n",
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });

  const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = async (values: z.infer<typeof formSchema>) => {
    if (!currentUser || !currentUser.company) {
      errorToast({
        title: t("generic.errors.error"),
        error: new Error("User or company not found"),
      });
      return;
    }

    const payload: CompanyInput = {
      id: currentUser.company.id,
      license: values.license,
      privateKey: values.privateKey,
    };

    try {
      const updatedLicense = await CompanyService.activateLicense(payload);

      const fullUser = await UserService.findFullUser();

      if (fullUser) {
        setUser(fullUser);
        const token = {
          userId: fullUser.id,
          companyId: fullUser.company?.id,
          licenseExpirationDate: fullUser.company?.licenseExpirationDate,
          roles: fullUser.roles.map((role) => role.id),
          features: fullUser.company?.features?.map((feature) => feature.id) ?? [],
          modules: fullUser.modules.map((module) => {
            return { id: module.id, permissions: module.permissions };
          }),
        };

        await updateToken(token);
        deleteCookie("reloadData");
      }

      revalidatePaths(generateUrl({ page: Modules.Company, id: updatedLicense.id, language: `[locale]` }));
      router.push(generateUrl({ page: "/" }));
    } catch (error) {
      errorToast({
        title: t(`generic.errors.update`),
        error,
      });
    }
  };

  if (!currentUser || !currentUser.company) return null;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="relative flex min-h-screen w-full flex-col items-center justify-center"
      >
        <div className="absolute left-4 top-4 z-0">
          <Image src={`/logo.webp`} className="object-contain p-4" height={300} width={300} alt={"Asset2Go"} priority />
        </div>
        <Card className="w-3xl z-10">
          {hasRole(AuthRole.CompanyAdministrator) ? (
            <>
              <CardHeader>
                <CardTitle>Company License Required</CardTitle>
                <CardDescription className={`flex w-full flex-col`}>
                  <div>You need to activate your license to use Asset2Go.</div>
                  <div>
                    <span>To obtain your license, please visit</span>
                    <Link href="https://app.carlonicora.com" target="_blank" className={`text-primary`}>
                      our website (https://app.carlonicora.com)
                    </Link>
                    <span>, register for an account and follow the instructions provided.</span>
                  </div>
                  <div>You will be required to provide the installation identifier provided below.</div>
                  <div>
                    Once you have activated your license, please paste your license and private key in the fields below.
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-y-4">
                <div>
                  <Label>Installation Identifier</Label>
                  <div className="flex items-center">
                    <Input disabled value={currentUser.company.id} />
                    <ClipboardIcon
                      className="text-muted-foreground ml-2 cursor-pointer"
                      onClick={() => copyToClipboard(currentUser!.company!.id)}
                    />
                  </div>
                </div>
                <div>
                  <FormInput form={form} id="license" name={"license"} placeholder="Enter your license" />
                </div>
                <div>
                  <FormTextarea name="Private Key" form={form} id="privateKey" placeholder="Enter your private key" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit">Activate License</Button>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>Company License Required</CardTitle>
                <CardDescription className={`flex w-full flex-col`}>
                  The company license is either missing or expired.
                </CardDescription>
              </CardHeader>
              <CardContent>Please contact your system administrator to resolve this issue.</CardContent>
            </>
          )}
        </Card>
      </form>
    </Form>
  );
}
