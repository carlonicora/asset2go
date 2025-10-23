"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { errorToast } from "@/features/common/components/errors/errorToast";
import CommonEditorButtons from "@/features/common/components/forms/CommonEditorButtons";
import CommonEditorHeader from "@/features/common/components/forms/CommonEditorHeader";
import CommonEditorTrigger from "@/features/common/components/forms/CommonEditorTrigger";
import FormInput from "@/features/common/components/forms/FormInput";
import { SupplierInput, SupplierInterface } from "@/features/features/supplier/data/SupplierInterface";
import { SupplierService } from "@/features/features/supplier/data/SupplierService";
import { usePageUrlGenerator } from "@/hooks/usePageUrlGenerator";
import { useRouter } from "@/i18n/routing";
import { revalidatePaths } from "@/lib/PageRevalidation";
import { Modules } from "@/modules/modules";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { v4 } from "uuid";
import { z } from "zod";

type SupplierEditorProps = {
  supplier?: SupplierInterface;
  propagateChanges?: (supplier: SupplierInterface) => void;
};

export default function SupplierEditor({ supplier, propagateChanges }: SupplierEditorProps) {
  const router = useRouter();
  const generateUrl = usePageUrlGenerator();
  const [open, setOpen] = useState<boolean>(false);
  const t = useTranslations();

  const formSchema = z.object({
    id: z.uuidv4(),
    name: z.string().min(1, {
      message: t(`features.supplier.fields.name.error`),
    }),
    address: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  });

  const getDefaultValues = () => ({
    id: supplier?.id || v4(),
    name: supplier?.name || "",
    address: supplier?.address || "",
    email: supplier?.email || "",
    phone: supplier?.phone || "",
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  useEffect(() => {
    if (!open) {
      form.reset(getDefaultValues());
    }
  }, [open]);

  const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = async (values: z.infer<typeof formSchema>) => {
    const payload: SupplierInput = {
      id: values.id,
      name: values.name,
      address: values.address,
      email: values.email,
      phone: values.phone,
    };

    try {
      const updatedSupplier = supplier ? await SupplierService.update(payload) : await SupplierService.create(payload);

      revalidatePaths(generateUrl({ page: Modules.Supplier, id: updatedSupplier.id, language: `[locale]` }));
      if (supplier && propagateChanges) {
        propagateChanges(updatedSupplier);
        setOpen(false);
      } else {
        router.push(generateUrl({ page: Modules.Supplier, id: updatedSupplier.id }));
      }
    } catch (error) {
      errorToast({
        title: supplier ? t(`generic.errors.update`) : t(`generic.errors.create`),
        error,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <CommonEditorTrigger isEdit={!!supplier} />
      <DialogContent className={`flex max-h-[70vh] max-w-3xl flex-col overflow-y-auto`}>
        <CommonEditorHeader type={t(`types.suppliers`, { count: 1 })} name={supplier?.name} />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full flex-col gap-y-4">
            <div className="flex flex-col justify-between gap-x-4">
              <FormInput
                form={form}
                id="name"
                name={t(`features.supplier.fields.name.label`)}
                placeholder={t(`features.supplier.fields.name.placeholder`)}
                isRequired
              />
              <FormInput
                form={form}
                id="address"
                name={t(`features.supplier.fields.address.label`)}
                placeholder={t(`features.supplier.fields.address.placeholder`)}
              />
              <FormInput
                form={form}
                id="email"
                name={t(`features.supplier.fields.email.label`)}
                placeholder={t(`features.supplier.fields.email.placeholder`)}
              />
              <FormInput
                form={form}
                id="phone"
                name={t(`features.supplier.fields.phone.label`)}
                placeholder={t(`features.supplier.fields.phone.placeholder`)}
              />
              <CommonEditorButtons form={form} setOpen={setOpen} isEdit={!!supplier} />
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
