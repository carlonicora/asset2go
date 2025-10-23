"use client";

import { UserInterface } from "@/features/foundations/user/data/UserInterface";
import { UserService } from "@/features/foundations/user/data/UserService";
import { DataListRetriever, useDataListRetriever } from "@/hooks/useDataListRetriever";

import { Modules } from "@/modules/modules";

import { ContentListTable } from "@/features/common/components/tables/ContentListTable";
import UserEditor from "@/features/foundations/user/components/forms/UserEditor";
import { useCurrentUserContext } from "@/features/foundations/user/contexts/CurrentUserContext";
import { UserFields } from "@/features/foundations/user/data/UserFields";
import "@/features/foundations/user/hooks/useUserTableStructure";
import { useTranslations } from "next-intl";
import { ReactNode, useEffect } from "react";

type CompanyUsersListProps = {
  isDeleted?: boolean;
};

export default function CompanyUsersList({ isDeleted }: CompanyUsersListProps) {
  const { company } = useCurrentUserContext();
  const t = useTranslations();

  const data: DataListRetriever<UserInterface> = useDataListRetriever({
    ready: !!company,
    retriever: (params) => UserService.findAllUsers(params),
    retrieverParams: { companyId: company?.id, isDeleted: isDeleted },
    module: Modules.User,
  });

  useEffect(() => {
    if (company) data.setReady(true);
  }, [company]);

  const functions: ReactNode[] = [<UserEditor key="create-user" propagateChanges={data.refresh} />];

  return (
    <ContentListTable
      data={data}
      fields={[UserFields.name, UserFields.email]}
      tableGeneratorType={Modules.User}
      functions={functions}
      title={t(`types.users`, { count: 2 })}
    />
  );
}
