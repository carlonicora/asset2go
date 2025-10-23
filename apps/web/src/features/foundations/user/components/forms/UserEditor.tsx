"use client";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { errorToast } from "@/features/common/components/errors/errorToast";
import CommonEditorButtons from "@/features/common/components/forms/CommonEditorButtons";
import CommonEditorHeader from "@/features/common/components/forms/CommonEditorHeader";
import CommonEditorTrigger from "@/features/common/components/forms/CommonEditorTrigger";
import FormCheckbox from "@/features/common/components/forms/FormCheckbox";
import FormInput from "@/features/common/components/forms/FormInput";
import FormPassword from "@/features/common/components/forms/FormPassword";
import FormTextarea from "@/features/common/components/forms/FormTextarea";
import { useCompanyContext } from "@/features/foundations/company/contexts/CompanyContext";
import { CompanyInterface } from "@/features/foundations/company/data/CompanyInterface";
import FormRoles from "@/features/foundations/role/components/forms/FormRoles";
import { RoleInterface } from "@/features/foundations/role/data/RoleInterface";
import { RoleService } from "@/features/foundations/role/data/RoleService";
import { S3Interface } from "@/features/foundations/s3/data/S3Interface";
import { S3Service } from "@/features/foundations/s3/data/S3Service";
import UserAvatarEditor from "@/features/foundations/user/components/forms/UserAvatarEditor";
import UserDeleter from "@/features/foundations/user/components/forms/UserDeleter";
import { useCurrentUserContext } from "@/features/foundations/user/contexts/CurrentUserContext";
import { UserInput, UserInterface } from "@/features/foundations/user/data/UserInterface";
import { UserService } from "@/features/foundations/user/data/UserService";
import { usePageUrlGenerator } from "@/hooks/usePageUrlGenerator";
import { useRouter } from "@/i18n/routing";
import { revalidatePaths } from "@/lib/PageRevalidation";
import { Modules } from "@/modules/modules";
import { AuthRole } from "@/permisions/enums/AuthRole";
import { Action } from "@/permisions/types";
import withPermissions from "@/permisions/wrappers/withPermissions";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { v4 } from "uuid";
import { z } from "zod";

type UserEditorProps = {
  user?: UserInterface;
  propagateChanges?: (user: UserInterface) => void;
  adminCreated?: boolean;
  trigger?: React.ReactNode;
};

function UserEditorInternal({ user, propagateChanges, adminCreated, trigger }: UserEditorProps) {
  const { company: userCompany, hasPermissionToModule, hasRole, currentUser, setUser } = useCurrentUserContext();
  const { company: companyFromContext } = useCompanyContext();
  const generateUrl = usePageUrlGenerator();
  const router = useRouter();
  const [open, setOpen] = useState<boolean>(false);
  const [roles, setRoles] = useState<RoleInterface[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [contentType, setContentType] = useState<string | null>(null);
  const t = useTranslations();
  const [resetImage, setResetImage] = useState<boolean>(false);
  const [company, setCompany] = useState<CompanyInterface | null>(companyFromContext || userCompany);

  useEffect(() => {
    if (!companyFromContext && userCompany) setCompany(userCompany);
  }, [company]);

  const formSchema = z.object({
    id: z.string().uuid().min(1),
    name: z.string().min(1, { message: t(`foundations.user.fields.name.error`) }),
    email: z.string().min(1, { message: t(`foundations.user.fields.email.error`) }),
    password: z.string().optional(),
    title: z.string().optional(),
    bio: z.string().optional(),
    phone: z.string().optional(),
    roleIds: z.array(z.string()).optional(),
    sendInvitationEmail: z.boolean().optional(),
    avatar: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: user?.id || v4(),
      name: user?.name || "",
      title: user?.title || "",
      bio: user?.bio || "",
      email: user?.email || "",
      phone: user?.phone || "",
      password: "",
      roleIds: user?.roles.map((role: RoleInterface) => role.id) || [],
      sendInvitationEmail: false,
      avatar: user?.avatarUrl || "",
    },
  });

  const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      try {
        const existingUser = await UserService.findByEmail({ email: values.email });
        if (existingUser) {
          form.setError("email", {
            type: "manual",
            message: t(`foundations.user.errors.email_exists`),
          });
          errorToast({ title: t(`foundations.user.errors.email_exists`), error: "" });
          return;
        }
      } catch (error) {
        // User does not exist, proceed
      }
    }

    if (values.avatar && contentType) {
      const s3: S3Interface = await S3Service.getPreSignedUrl({
        key: values.avatar,
        contentType: contentType,
        isPublic: true,
      });

      await fetch(s3.url, {
        method: "PUT",
        headers: s3.headers,
        body: file,
      });
    }

    const payload: UserInput = {
      id: values.id,
      email: values.email,
      name: values.name,
      title: values.title,
      bio: values.bio,
      phone: values.phone,
      password: values.password,
      avatar: resetImage ? undefined : values.avatar,
      roleIds: values.roleIds,
      sendInvitationEmail: values.sendInvitationEmail,
      companyId: company!.id,
      adminCreated: adminCreated,
    };

    try {
      const updatedUser = user ? await UserService.update(payload) : await UserService.create(payload);

      if (currentUser?.id === updatedUser.id) setUser(updatedUser);

      revalidatePaths(generateUrl({ page: Modules.User, id: updatedUser.id, language: `[locale]` }));
      if (propagateChanges) {
        propagateChanges(updatedUser);
        setOpen(false);
      } else {
        router.push(generateUrl({ page: Modules.User, id: updatedUser.id }));
      }
    } catch (error) {
      errorToast({ title: user ? t(`generic.errors.update`) : t(`generic.errors.create`), error });
    }
  };

  useEffect(() => {
    async function fetchRoles() {
      const roles = await RoleService.findAllRoles({});

      const availableRoles = roles.filter(
        (role: RoleInterface) =>
          role.id !== AuthRole.Administrator &&
          (role.requiredFeature === undefined ||
            company?.features.some((feature) => feature.id === role.requiredFeature?.id)),
      );

      setRoles(availableRoles);
    }

    if (
      open &&
      (company || currentUser?.roles.find((role: RoleInterface) => role.id === AuthRole.Administrator)) &&
      roles.length === 0
    )
      fetchRoles();
  }, [company, open]);

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

      const fileUrl = `companies/${company.id}/users/${id}/${id}.${timestamp}.${extension}`;
      form.setValue("avatar", fileUrl);

      setContentType(fileType);
    } else {
      setContentType(null);
    }
  }, [file]);

  const canChangeRoles =
    hasPermissionToModule({ module: Modules.Role, action: Action.Update }) || hasRole(AuthRole.Administrator);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : <CommonEditorTrigger isEdit={!!user} />}
      <DialogContent
        className={`flex max-h-[70vh] ${canChangeRoles ? `max-w-[90vw]` : `max-w-3xl`} min-h-3xl max-h-[90vh] flex-col overflow-y-auto`}
      >
        <CommonEditorHeader type={t(`types.users`, { count: 1 })} name={user?.name} />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={`flex w-full flex-col gap-y-4`}>
            <div className={`flex flex-row gap-x-4`}>
              <div className={`flex w-40 flex-col justify-start gap-y-2`}>
                <UserAvatarEditor
                  user={user}
                  file={file}
                  setFile={setFile}
                  resetImage={resetImage}
                  setResetImage={setResetImage}
                />
              </div>
              <div className={`flex w-full flex-col justify-start`}>
                <FormInput
                  form={form}
                  id="name"
                  name={t(`foundations.user.fields.name.label`)}
                  placeholder={t(`foundations.user.fields.name.placeholder`)}
                />
                <FormInput
                  form={form}
                  id="email"
                  name={t(`foundations.user.fields.email.label`)}
                  placeholder={t(`foundations.user.fields.email.placeholder`)}
                />
                <FormInput
                  form={form}
                  id="phone"
                  name={t(`foundations.user.fields.phone.label`)}
                  placeholder={t(`foundations.user.fields.phone.placeholder`)}
                />
                <FormPassword
                  form={form}
                  id="password"
                  name={t(`foundations.user.fields.password.label`)}
                  placeholder={t(`foundations.user.fields.password.placeholder`)}
                />
                <FormInput
                  form={form}
                  id="title"
                  name={t(`foundations.user.fields.title.label`)}
                  placeholder={t(`foundations.user.fields.title.placeholder`)}
                />
                <FormTextarea
                  form={form}
                  id="bio"
                  name={t(`foundations.user.fields.bio.label`)}
                  placeholder={t(`foundations.user.fields.bio.placeholder`)}
                  className="min-h-40"
                />
              </div>
              <div className="flex w-1/3 flex-col">
                {canChangeRoles && (
                  <FormRoles form={form} id="roleIds" name={t(`types.roles`, { count: 2 })} roles={roles} />
                )}
                {!user && (
                  <div className="flex flex-col gap-y-4">
                    <div className="text-sm font-semibold">{t(`foundations.user.send_activation_email`)}</div>
                    <FormCheckbox
                      form={form}
                      id="sendInvitationEmail"
                      name={t(`foundations.user.send_activation_email`)}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-x-4">
              {user && currentUser?.roles.find((role: RoleInterface) => role.id === AuthRole.Administrator) && (
                <UserDeleter
                  companyId={user.company?.id}
                  user={user}
                  onDeleted={() => {
                    setOpen(false);
                    if (propagateChanges) propagateChanges(user);
                  }}
                />
              )}
              <CommonEditorButtons form={form} setOpen={setOpen} isEdit={!!user} />
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function UserEditor(props: UserEditorProps) {
  const action = props.user ? Action.Update : Action.Create;

  const { hasRole } = useCurrentUserContext();

  if (hasRole(AuthRole.Administrator)) return <UserEditorInternal {...props} />;

  return withPermissions({ Component: UserEditorInternal, modules: [Modules.User], action, data: props.user })(props);
}
