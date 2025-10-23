"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { errorToast } from "@/features/common/components/errors/errorToast";
import CommonEditorButtons from "@/features/common/components/forms/CommonEditorButtons";
import CommonEditorHeader from "@/features/common/components/forms/CommonEditorHeader";
import CommonEditorTrigger from "@/features/common/components/forms/CommonEditorTrigger";
import FormDate from "@/features/common/components/forms/FormDate";
import FormInput from "@/features/common/components/forms/FormInput";
import FormTextarea from "@/features/common/components/forms/FormTextarea";
import FormTypeSelect from "@/features/common/components/forms/FormTypeSelect";
import { EquipmentInput, EquipmentInterface } from "@/features/features/equipment/data/EquipmentInterface";
import { EquipmentService } from "@/features/features/equipment/data/EquipmentService";
import SupplierSelector from "@/features/features/supplier/components/forms/SupplierSelector";
import { usePageUrlGenerator } from "@/hooks/usePageUrlGenerator";
import { useRouter } from "@/i18n/routing";
import { entityObjectSchema } from "@/lib/entity.object.schema";
import { revalidatePaths } from "@/lib/PageRevalidation";
import { Modules } from "@/modules/modules";
import { EquipmentStatus } from "@asset2go/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { v4 } from "uuid";
import { z } from "zod";

type EquipmentEditorProps = {
  equipment?: EquipmentInterface;
  propagateChanges?: (equipment: EquipmentInterface) => void;
};

export default function EquipmentEditor({ equipment, propagateChanges }: EquipmentEditorProps) {
  const router = useRouter();
  const generateUrl = usePageUrlGenerator();
  const [open, setOpen] = useState<boolean>(false);
  const t = useTranslations();

  const formSchema = z.object({
    id: z.uuidv4(),
    name: z.string().min(1, {
      message: t(`features.equipment.fields.name.error`),
    }),
    barcode: z.string().optional(),
    description: z.string().optional(),
    startDate: z.date().refine((val) => val !== undefined, {
      message: t(`features.equipment.fields.startDate.error`),
    }),
    endDate: z.date().optional(),
    status: z.string().min(1, {
      message: t(`features.equipment.fields.status.error`),
    }),
    supplier: entityObjectSchema.refine((data) => data.id && data.id.length > 0, {
      message: t(`features.equipment.relationships.supplier.error`),
    }),
  });

  const getDefaultValues = () => ({
    id: equipment?.id || v4(),
    name: equipment?.name || "",
    barcode: equipment?.barcode || "",
    description: equipment?.description || "",
    startDate: equipment?.startDate || undefined,
    endDate: equipment?.endDate || undefined,
    status: equipment?.status || "",
    supplier: equipment?.supplier ? { id: equipment.supplier.id, name: equipment.supplier.name } : undefined,
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
    const payload: EquipmentInput = {
      id: values.id,
      name: values.name,
      barcode: values.barcode,
      description: values.description,
      startDate: values.startDate,
      endDate: values.endDate,
      status: values.status,
      supplierId: values.supplier.id,
    };

    try {
      const updatedEquipment = equipment
        ? await EquipmentService.update(payload)
        : await EquipmentService.create(payload);

      revalidatePaths(generateUrl({ page: Modules.Equipment, id: updatedEquipment.id, language: `[locale]` }));
      if (equipment && propagateChanges) {
        propagateChanges(updatedEquipment);
        setOpen(false);
      } else {
        router.push(generateUrl({ page: Modules.Equipment, id: updatedEquipment.id }));
      }
    } catch (error) {
      errorToast({
        title: equipment ? t(`generic.errors.update`) : t(`generic.errors.create`),
        error,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <CommonEditorTrigger isEdit={!!equipment} />
      <DialogContent className={`flex max-h-[70vh] max-w-3xl flex-col overflow-y-auto`}>
        <CommonEditorHeader type={t(`types.equipments`, { count: 1 })} name={equipment?.name} />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full flex-col gap-y-4">
            <div className="flex flex-col justify-between gap-x-4">
              <FormInput
                form={form}
                id="name"
                name={t(`features.equipment.fields.name.label`)}
                placeholder={t(`features.equipment.fields.name.placeholder`)}
                isRequired
              />
              <FormInput
                form={form}
                id="barcode"
                name={t(`features.equipment.fields.barcode.label`)}
                placeholder={t(`features.equipment.fields.barcode.placeholder`)}
              />
              <FormTextarea
                className="h-20 min-h-20"
                form={form}
                id="description"
                name={t(`features.equipment.fields.description.label`)}
                placeholder={t(`features.equipment.fields.description.placeholder`)}
              />
              <FormDate
                form={form}
                id="startDate"
                name={t(`features.equipment.fields.startDate.label`)}
                placeholder={t(`features.equipment.fields.startDate.placeholder`)}
              />
              <FormDate
                form={form}
                id="endDate"
                name={t(`features.equipment.fields.endDate.label`)}
                placeholder={t(`features.equipment.fields.endDate.placeholder`)}
              />
              <FormTypeSelect
                form={form}
                id="status"
                name={t(`features.equipment.fields.status.label`)}
                placeholder={t(`features.equipment.fields.status.placeholder`)}
                type={EquipmentStatus}
                translationKey="features.equipment.fields.status.select"
                isRequired
              />
              <SupplierSelector
                form={form}
                id="supplier"
                label={t(`features.equipment.relationships.supplier.label`)}
                placeholder={t(`features.equipment.relationships.supplier.placeholder`)}
                isRequired
              />
              <CommonEditorButtons form={form} setOpen={setOpen} isEdit={!!equipment} />
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
