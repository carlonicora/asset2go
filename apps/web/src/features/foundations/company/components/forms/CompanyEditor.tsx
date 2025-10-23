"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { errorToast } from "@/features/common/components/errors/errorToast";
import CommonEditorButtons from "@/features/common/components/forms/CommonEditorButtons";
import CommonEditorHeader from "@/features/common/components/forms/CommonEditorHeader";
import CommonEditorTrigger from "@/features/common/components/forms/CommonEditorTrigger";
import { FileInput, FileUploader } from "@/features/common/components/forms/FileUploader";
import FormInput from "@/features/common/components/forms/FormInput";
import { CompanyInput, CompanyInterface } from "@/features/foundations/company/data/CompanyInterface";
import { CompanyService } from "@/features/foundations/company/data/CompanyService";
import FormFeatures from "@/features/foundations/feature/components/forms/FormFeatures";
import { FeatureInterface } from "@/features/foundations/feature/data/FeatureInterface";
import { FeatureService } from "@/features/foundations/feature/data/FeatureService";
import { S3Interface } from "@/features/foundations/s3/data/S3Interface";
import { S3Service } from "@/features/foundations/s3/data/S3Service";
import { useCurrentUserContext } from "@/features/foundations/user/contexts/CurrentUserContext";
import { usePageUrlGenerator } from "@/hooks/usePageUrlGenerator";
import { useRouter } from "@/i18n/routing";
import { revalidatePaths } from "@/lib/PageRevalidation";
import { Modules } from "@/modules/modules";
import { AuthRole } from "@/permisions/enums/AuthRole";
import { Action } from "@/permisions/types";
import withPermissions from "@/permisions/wrappers/withPermissions";
import { zodResolver } from "@hookform/resolvers/zod";
import { UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";
import { DropzoneOptions } from "react-dropzone/.";
import { SubmitHandler, useForm } from "react-hook-form";
import { v4 } from "uuid";
import { z } from "zod";

type CompanyEditorProps = {
  company?: CompanyInterface;
  propagateChanges?: (company: CompanyInterface) => void;
};

function CompanyEditorInternal({ company, propagateChanges }: CompanyEditorProps) {
  const { hasRole } = useCurrentUserContext();
  const router = useRouter();
  const [open, setOpen] = useState<boolean>(false);
  const [features, setFeatures] = useState<FeatureInterface[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[] | null>(null);
  const [contentType, setContentType] = useState<string | null>(null);
  const t = useTranslations();
  const generateUrl = usePageUrlGenerator();

  const formSchema = z.object({
    id: z.uuidv4(),
    name: z.string().min(1, {
      message: t(`foundations.company.fields.name.error`),
    }),
    featureIds: z.array(z.string()).optional(),
    moduleIds: z.array(z.string()).optional(),
    logo: z.string().optional(),
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: company?.id || v4(),
      name: company?.name || "",
      featureIds: company?.features.map((feature) => feature.id) || [],
      moduleIds: company?.modules.map((module) => module.id) || [],
      logo: company?.logo || "",
    },
  });

  const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = async (values: z.infer<typeof formSchema>) => {
    if (values.logo && contentType) {
      const s3: S3Interface = await S3Service.getPreSignedUrl({
        key: values.logo,
        contentType: contentType,
        isPublic: true,
      });

      await fetch(s3.url, {
        method: "PUT",
        headers: s3.headers,
        body: file,
      });
    }

    const payload: CompanyInput = {
      id: company?.id ?? v4(),
      name: values.name,
      logo: files && contentType ? values.logo : undefined,
      featureIds: values.featureIds,
      moduleIds: values.moduleIds,
    };

    try {
      const updatedCompany = company ? await CompanyService.update(payload) : await CompanyService.create(payload);

      revalidatePaths(generateUrl({ page: Modules.Company, id: updatedCompany.id, language: `[locale]` }));
      if (company && propagateChanges) {
        propagateChanges(updatedCompany);
        setOpen(false);
      } else {
        router.push(`/administration/companies/${updatedCompany.id}`);
      }
    } catch (error) {
      errorToast({
        title: company ? t(`generic.errors.update`) : t(`generic.errors.create`),
        error,
      });
    }
  };

  useEffect(() => {
    const fetchFeatures = async () => {
      const allfeatures = await FeatureService.findMany({});
      if (hasRole(AuthRole.Administrator)) {
        setFeatures(allfeatures.filter((feature) => feature.modules && feature.modules.length > 0));
      } else {
        setFeatures(
          allfeatures.filter((feature) => feature.isProduction && feature.modules && feature.modules.length > 0),
        );
      }
    };
    if (open && (hasRole(AuthRole.Administrator) || hasRole(AuthRole.CompanyAdministrator))) fetchFeatures();
  }, [open]);

  useEffect(() => {
    if (file && company) {
      const id = form.getValues("id");
      const fileType = file.type;
      let extension = "";

      switch (fileType) {
        default:
          extension = file.type.split("/").pop() ?? "";
          break;
      }

      const timestamp = new Date().toISOString().replace(/[-:T]/g, "").split(".")[0];

      const fileUrl = `companies/${form.getValues("id")}/companies/${id}/${id}.${timestamp}.${extension}`;
      form.setValue("logo", fileUrl);

      setContentType(fileType);
    } else {
      setContentType(null);
    }
  }, [file]);

  useEffect(() => {
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  }, [files]);

  const dropzone = {
    multiple: false,
    maxSize: 100 * 1024 * 1024,
    preventDropOnDocument: false,
    accept: {
      "application/images": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
    },
  } satisfies DropzoneOptions;

  const canAccessFeatures =
    (hasRole(AuthRole.Administrator) || hasRole(AuthRole.CompanyAdministrator)) && features.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <CommonEditorTrigger isEdit={!!company} />
      <DialogContent
        className={`flex max-h-[70vh] ${canAccessFeatures ? `max-w-[90vw]` : `max-w-3xl`} flex-col overflow-y-auto`}
      >
        <CommonEditorHeader type={t(`types.companies`, { count: 1 })} name={company?.name} />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={`flex w-full flex-col gap-y-4`}>
            <div className={`flex flex-row gap-x-4`}>
              <div className={`flex ${canAccessFeatures ? `w-1/2` : `w-full`} flex-col justify-start gap-y-4`}>
                <FileUploader value={files} onValueChange={setFiles} dropzoneOptions={dropzone} className="w-full p-4">
                  <FileInput className="text-neutral-300 outline-dashed">
                    <div className="flex w-full flex-col items-center justify-center pb-4 pt-3">
                      <div className="flex w-full flex-col items-center justify-center pb-4 pt-3">
                        {file || company?.logo ? (
                          <Image
                            src={file ? URL.createObjectURL(file) : company?.logo || ""}
                            alt="Company Logo"
                            width={200}
                            height={200}
                          />
                        ) : (
                          <>
                            <UploadIcon className="my-4 h-8 w-8" />
                            <p className="text-swanlake-text-paragraph mb-1 text-sm text-gray-500">
                              <span className="font-semibold">{t(`foundations.company.click_drag_logo`)}</span>
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </FileInput>
                </FileUploader>
                <FormInput
                  form={form}
                  id="name"
                  name={t(`foundations.company.fields.name.label`)}
                  placeholder={t(`foundations.company.fields.name.placeholder`)}
                />
              </div>
              {canAccessFeatures && (
                <div className={`min-w-1/2 flex w-1/2 flex-col justify-start gap-y-4`}>
                  <ScrollArea className="h-max">
                    <FormFeatures
                      form={form}
                      name={t(`foundations.company.features_and_modules`)}
                      features={features}
                    />
                  </ScrollArea>
                </div>
              )}
            </div>
            <CommonEditorButtons form={form} setOpen={setOpen} isEdit={!!company} />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function CompanyEditor(props: CompanyEditorProps) {
  const action = props.company ? Action.Update : Action.Create;
  const { currentUser, hasRole } = useCurrentUserContext();
  if (!currentUser) return null;

  if (hasRole(AuthRole.Administrator)) return <CompanyEditorInternal {...props} />;

  return withPermissions({
    Component: CompanyEditorInternal,
    modules: [Modules.Company],
    action,
  })(props);
}
