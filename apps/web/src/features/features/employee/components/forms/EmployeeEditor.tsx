"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { errorToast } from "@/features/common/components/errors/errorToast";
import CommonEditorButtons from "@/features/common/components/forms/CommonEditorButtons";
import CommonEditorHeader from "@/features/common/components/forms/CommonEditorHeader";
import CommonEditorTrigger from "@/features/common/components/forms/CommonEditorTrigger";
import FormInput from "@/features/common/components/forms/FormInput";
import { EmployeeInput, EmployeeInterface } from "@/features/features/employee/data/EmployeeInterface";
import { EmployeeService } from "@/features/features/employee/data/EmployeeService";
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

type EmployeeEditorProps = {
  employee?: EmployeeInterface;
  propagateChanges?: (employee: EmployeeInterface) => void;
};

export default function EmployeeEditor({ employee, propagateChanges }: EmployeeEditorProps) {
  const router = useRouter();
  const generateUrl = usePageUrlGenerator();
  const [open, setOpen] = useState<boolean>(false);
  const t = useTranslations();

  const formSchema = z.object({
    id: z.uuidv4(),
    name: z.string().min(1, {
      message: t(`features.employee.fields.name.error`),
    }),
    phone: z.string().optional(),
    email: z.string().optional(),
    avatar: z.string().optional(),
  });

  const getDefaultValues = () => ({
    id: employee?.id || v4(),
    name: employee?.name || "",
    phone: employee?.phone || "",
    email: employee?.email || "",
    avatar: employee?.avatar || "",
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
    const payload: EmployeeInput = {
      id: values.id,
      name: values.name,
      phone: values.phone,
      email: values.email,
      avatar: values.avatar,
    };

    try {
      const updatedEmployee = employee ? await EmployeeService.update(payload) : await EmployeeService.create(payload);

      revalidatePaths(generateUrl({ page: Modules.Employee, id: updatedEmployee.id, language: `[locale]` }));
      if (employee && propagateChanges) {
        propagateChanges(updatedEmployee);
        setOpen(false);
      } else {
        router.push(generateUrl({ page: Modules.Employee, id: updatedEmployee.id }));
      }
    } catch (error) {
      errorToast({
        title: employee ? t(`generic.errors.update`) : t(`generic.errors.create`),
        error,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <CommonEditorTrigger isEdit={!!employee} />
      <DialogContent className={`flex max-h-[70vh] max-w-3xl flex-col overflow-y-auto`}>
        <CommonEditorHeader type={t(`types.employees`, { count: 1 })} name={employee?.name} />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full flex-col gap-y-4">
            <div className="flex flex-col justify-between gap-x-4">
              <FormInput
                form={form}
                id="name"
                name={t(`features.employee.fields.name.label`)}
                placeholder={t(`features.employee.fields.name.placeholder`)}
                isRequired
              />
              <FormInput
                form={form}
                id="phone"
                name={t(`features.employee.fields.phone.label`)}
                placeholder={t(`features.employee.fields.phone.placeholder`)}
              />
              <FormInput
                form={form}
                id="email"
                name={t(`features.employee.fields.email.label`)}
                placeholder={t(`features.employee.fields.email.placeholder`)}
              />
              {/* <FormInput
                form={form}
                id="avatar"
                name={t(`features.employee.fields.avatar.label`)}
                placeholder={t(`features.employee.fields.avatar.placeholder`)}
              /> */}
              <CommonEditorButtons form={form} setOpen={setOpen} isEdit={!!employee} />
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
