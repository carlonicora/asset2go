"use client";

import { SharedProvider } from "@/features/common/contexts/SharedContext";
import { BreadcrumbItemData } from "@/features/common/interfaces/breadcrumb.item.data.interface";
import UserDeleter from "@/features/foundations/user/components/forms/UserDeleter";
import UserEditor from "@/features/foundations/user/components/forms/UserEditor";
import UserReactivator from "@/features/foundations/user/components/forms/UserReactivator";
import UserResentInvitationEmail from "@/features/foundations/user/components/forms/UserResentInvitationEmail";
import { UserInterface } from "@/features/foundations/user/data/UserInterface";
import { usePageUrlGenerator } from "@/hooks/usePageUrlGenerator";

import { JsonApiHydratedDataInterface } from "@/jsonApi/interfaces/JsonApiHydratedDataInterface";
import { rehydrate } from "@/jsonApi/Rehydrator";
import { Modules } from "@/modules/modules";
import { useTranslations } from "next-intl";
import { createContext, ReactNode, useContext, useState } from "react";

interface UserContextType {
  user: UserInterface | undefined;
  setUser: (value: UserInterface | undefined) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

type UserProviderProps = {
  children: ReactNode;
  dehydratedUser?: JsonApiHydratedDataInterface;
};

export const UserProvider = ({ children, dehydratedUser }: UserProviderProps) => {
  const generateUrl = usePageUrlGenerator();
  const t = useTranslations();

  const [user, setUser] = useState<UserInterface | undefined>(
    dehydratedUser ? rehydrate<UserInterface>(Modules.User, dehydratedUser) : undefined,
  );

  const breadcrumb = () => {
    const response: BreadcrumbItemData[] = [];

    response.push({
      name: t(`types.users`, { count: 2 }),
      href: generateUrl({ page: Modules.User }),
    });

    if (user)
      response.push({
        name: `${user.name}${user.isDeleted ? ` (${t(`foundations.user.deleted`)})` : ""}`,
        href: generateUrl({ page: Modules.User, id: user.id }),
      });

    return response;
  };

  const title = () => {
    const response: any = {
      type: t(`types.users`, { count: user ? 1 : 2 }),
    };

    const functions: ReactNode[] = [];

    if (user) {
      response.element = `${user.name}${user.isDeleted ? ` (${t(`foundations.user.deleted`)})` : ""}`;

      if (user.isDeleted) {
        functions.push(<UserReactivator key={`UserReactivator`} user={user} propagateChanges={setUser} />);
      } else {
        if (!user.isActivated)
          functions.push(<UserResentInvitationEmail key={`UserResentInvitationEmail`} user={user} />);
        functions.push(<UserDeleter key={`UserDeleter`} user={user} />);
      }

      functions.push(<UserEditor key={`UserEditor`} user={user} propagateChanges={setUser} />);
    }

    if (functions.length > 0) response.functions = functions;

    return response;
  };

  return (
    <SharedProvider value={{ breadcrumbs: breadcrumb(), title: title() }}>
      <UserContext.Provider
        value={{
          user: user,
          setUser: setUser,
        }}
      >
        {children}
      </UserContext.Provider>
    </SharedProvider>
  );
};

export const useUserContext = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
};
