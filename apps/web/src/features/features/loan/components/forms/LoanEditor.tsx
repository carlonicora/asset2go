"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { errorToast } from "@/features/common/components/errors/errorToast";
import CommonEditorButtons from "@/features/common/components/forms/CommonEditorButtons";
import CommonEditorHeader from "@/features/common/components/forms/CommonEditorHeader";
import CommonEditorTrigger from "@/features/common/components/forms/CommonEditorTrigger";
import FormDate from "@/features/common/components/forms/FormDate";
import EmployeeSelector from "@/features/features/employee/components/forms/EmployeeSelector";
import EquipmentSelector from "@/features/features/equipment/components/forms/EquipmentSelector";
import { LoanInput, LoanInterface } from "@/features/features/loan/data/LoanInterface";
import { LoanService } from "@/features/features/loan/data/LoanService";
import { usePageUrlGenerator } from "@/hooks/usePageUrlGenerator";
import { useRouter } from "@/i18n/routing";
import { entityObjectSchema } from "@/lib/entity.object.schema";
import { revalidatePaths } from "@/lib/PageRevalidation";
import { Modules } from "@/modules/modules";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { v4 } from "uuid";
import { z } from "zod";

type LoanEditorProps = {
  loan?: LoanInterface;
  propagateChanges?: (loan: LoanInterface) => void;
};

export default function LoanEditor({ loan, propagateChanges }: LoanEditorProps) {
  const router = useRouter();
  const generateUrl = usePageUrlGenerator();
  const [open, setOpen] = useState<boolean>(false);
  const t = useTranslations();

  const formSchema = z.object({
    id: z.uuidv4(),
    startDate: z.date().refine((val) => val !== undefined, {
      message: t(`features.loan.fields.startDate.error`),
    }),
    endDate: z.date().optional(),
    employee: entityObjectSchema.refine((data) => data.id && data.id.length > 0, {
      message: t(`features.loan.relationships.employee.error`),
    }),
    equipment: entityObjectSchema.refine((data) => data.id && data.id.length > 0, {
      message: t(`features.loan.relationships.equipment.error`),
    }),
  });

  const getDefaultValues = () => ({
    id: loan?.id || v4(),
    startDate: loan?.startDate || undefined,
    endDate: loan?.endDate || undefined,
    employee: loan?.employee ? { id: loan.employee.id, name: loan.employee.name } : undefined,
    equipment: loan?.equipment ? { id: loan.equipment.id, name: loan.equipment.name } : undefined,
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
    const payload: LoanInput = {
      id: values.id,
      startDate: values.startDate,
      endDate: values.endDate,
      employeeId: values.employee.id,
      equipmentId: values.equipment.id,
    };

    try {
      const updatedLoan = loan ? await LoanService.update(payload) : await LoanService.create(payload);

      revalidatePaths(generateUrl({ page: Modules.Loan, id: updatedLoan.id, language: `[locale]` }));
      if (loan && propagateChanges) {
        propagateChanges(updatedLoan);
        setOpen(false);
      } else {
        router.push(generateUrl({ page: Modules.Loan, id: updatedLoan.id }));
      }
    } catch (error) {
      errorToast({
        title: loan ? t(`generic.errors.update`) : t(`generic.errors.create`),
        error,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <CommonEditorTrigger isEdit={!!loan} />
      <DialogContent className={`flex max-h-[70vh] max-w-3xl flex-col overflow-y-auto`}>
        <CommonEditorHeader type={t(`types.loans`, { count: 1 })} />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full flex-col gap-y-4">
            <div className="flex flex-col justify-between gap-x-4">
              <FormDate
                form={form}
                id="startDate"
                name={t(`features.loan.fields.startDate.label`)}
                placeholder={t(`features.loan.fields.startDate.placeholder`)}
                isRequired
              />
              <FormDate
                form={form}
                id="endDate"
                name={t(`features.loan.fields.endDate.label`)}
                placeholder={t(`features.loan.fields.endDate.placeholder`)}
              />
              <EmployeeSelector
                form={form}
                id="employee"
                label={t(`features.loan.relationships.employee.label`)}
                placeholder={t(`features.loan.relationships.employee.placeholder`)}
                isRequired
              />
              <EquipmentSelector
                form={form}
                id="equipment"
                label={t(`features.loan.relationships.equipment.label`)}
                placeholder={t(`features.loan.relationships.equipment.placeholder`)}
                isRequired
              />
              <CommonEditorButtons form={form} setOpen={setOpen} isEdit={!!loan} />
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
