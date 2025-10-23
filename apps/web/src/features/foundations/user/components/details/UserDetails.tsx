"use client";

import { Badge } from "@/components/ui/badge";
import AttributeElement from "@/features/common/components/lists/AttributeElement";
import { RoleInterface } from "@/features/foundations/role/data/RoleInterface";
import { usePageUrlGenerator } from "@/hooks/usePageUrlGenerator";

import { Link } from "@/components/custom-ui/link";
import ContentTitle from "@/features/common/components/navigations/ContentTitle";
import { useSharedContext } from "@/features/common/contexts/SharedContext";
import { UserInterface } from "@/features/foundations/user/data/UserInterface";
import { Modules } from "@/modules/modules";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ReactElement } from "react";

type UserDetailsProps = {
  user: UserInterface;
};

export default function UserDetails({ user }: UserDetailsProps) {
  const generateUrl = usePageUrlGenerator();
  const t = useTranslations();
  const { title } = useSharedContext();

  let roles: ReactElement<any> = <></>;

  if (user.roles && user.roles.length > 0) {
    roles = (
      <div className="mb-4 w-full">
        <div className="flex flex-wrap gap-2">
          {user.roles.map((role: RoleInterface, index: number) => (
            <Link key={role.id} href={generateUrl({ page: Modules.Role, id: role.id })}>
              <Badge className="mr-2" variant={`default`}>
                {t(`foundations.role.roles`, { role: role.id.replaceAll(`-`, ``) })}
              </Badge>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-y-2">
      {user.avatar && (
        <div className="relative aspect-auto w-full max-w-md overflow-hidden rounded-lg">
          <Image
            src={user.avatar}
            alt={user.name}
            width={800}
            height={600}
            className="h-auto w-full rounded-lg object-contain"
          />
        </div>
      )}
      <ContentTitle type={title.type} element={title.element} functions={title.functions} />
      {user.isDeleted ? (
        <div>
          <Badge variant="destructive">{t(`foundations.user.errors.deleted`)}</Badge>
        </div>
      ) : (
        <>
          {!user.isActivated && (
            <div>
              <Badge variant="destructive">{t(`foundations.user.errors.inactive`)}</Badge>
            </div>
          )}
        </>
      )}
      {roles}
      <AttributeElement inline={true} title={t(`foundations.user.fields.title.label`)} value={user.title} />
      <AttributeElement inline={true} title={t(`foundations.user.fields.email.label`)} value={user.email} />
      {user.phone && (
        <AttributeElement inline={true} title={t(`foundations.user.fields.phone.label`)} value={user.phone} />
      )}
      <AttributeElement inline={false} title={t(`foundations.user.fields.bio.label`)} value={user.bio} />
    </div>
  );
}
