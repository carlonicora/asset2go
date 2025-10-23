"use client";

import { Link } from "@/components/custom-ui/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { recentPagesAtom } from "@/features/common/atoms/recentPagesAtom";
import InboxNavigator from "@/features/common/components/navigations/InboxNavigator";
import RecentPagesNavigator from "@/features/common/components/navigations/RecentPagesNavigator";
import { useNotificationContext } from "@/features/foundations/notification/contexts/NotificationContext";
import UserSidebarFooter from "@/features/foundations/user/components/navigations/UserSidebarFooter";
import { useCurrentUserContext } from "@/features/foundations/user/contexts/CurrentUserContext";
import { usePageUrlGenerator } from "@/hooks/usePageUrlGenerator";

import { Modules } from "@/modules/modules";
import { AuthRole } from "@/permisions/enums/AuthRole";
import { useAtomValue } from "jotai";
import { BellIcon, HammerIcon, HandCoinsIcon, HistoryIcon, HomeIcon, PackageIcon, UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Fragment, ReactNode, useMemo, useState } from "react";

export type NavigationItem = {
  title: string;
  component?: React.ReactNode;
  url: string;
  onClick?: () => void;
  icon: ReactNode;
  testId?: string;
};

export default function CommonSidebar() {
  const { state } = useSidebar();
  const { currentUser, company, hasPermissionToPath, hasAccesToFeature, hasPermissionToModule, hasRole } =
    useCurrentUserContext();
  const generateUrl = usePageUrlGenerator();
  const t = useTranslations();
  const { notifications } = useNotificationContext();
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const recentPages = useAtomValue(recentPagesAtom);

  const unreadCount = useMemo(() => {
    return notifications.filter((notif) => !notif.isRead).length;
  }, [notifications]);

  const navigationMap = useMemo(() => {
    const navMap = new Map<string, { hasTitle: boolean; items: NavigationItem[] }>([
      ["/", { hasTitle: false, items: [] }],
      ["", { hasTitle: false, items: [] }],
    ]);

    // Home
    navMap.get("/")?.items.push({
      title: t(`generic.home`),
      url: generateUrl({ page: `/` }),
      icon: <HomeIcon />,
      testId: "sidebar-home-link",
    });

    if (!hasRole(AuthRole.Administrator)) {
      navMap.get("/")?.items.push({
        title:
          unreadCount > 0
            ? `${t(`foundations.notification.inbox`)} - ${unreadCount}`
            : t(`foundations.notification.inbox`),
        component: <InboxNavigator />,
        url: generateUrl({ page: Modules.Notification }),
        icon: <BellIcon className={`${unreadCount > 0 ? "text-destructive" : ""}`} />,
        testId: "sidebar-inbox-link",
      });
    }

    // Recent Pages
    if (recentPages.length > 0) {
      navMap.get("/")?.items.push({
        title: t(`generic.recent_pages`),
        component: <RecentPagesNavigator />,
        url: "#",
        icon: <HistoryIcon />,
        testId: "sidebar-recent-pages",
      });
    }

    if (company) {
      // navMap.get("")?.items.push({
      //   title: company.name,
      //   url: generateUrl({ page: Modules.Company }),
      //   icon: <Building2Icon />,
      //   testId: "sidebar-my-company-link",
      // });

      navMap.get("")?.items.push({
        title: t(`types.equipments`, { count: 2 }),
        url: generateUrl({ page: Modules.Equipment }),
        icon: <HammerIcon />,
        testId: "sidebar-equipment-link",
      });

      navMap.get("")?.items.push({
        title: t(`types.suppliers`, { count: 2 }),
        url: generateUrl({ page: Modules.Supplier }),
        icon: <PackageIcon />,
        testId: "sidebar-supplier-link",
      });

      navMap.get("")?.items.push({
        title: t(`types.employees`, { count: 2 }),
        url: generateUrl({ page: Modules.Employee }),
        icon: <UsersIcon />,
        testId: "sidebar-employee-link",
      });

      navMap.get("")?.items.push({
        title: t(`types.loans`, { count: 2 }),
        url: generateUrl({ page: Modules.Loan }),
        icon: <HandCoinsIcon />,
        testId: "sidebar-loan-link",
      });
    }

    return navMap;
  }, [currentUser, company, unreadCount, recentPages, t, generateUrl, hasRole]);

  return (
    <Sidebar data-testid="sidebar-container" collapsible="icon">
      <SidebarHeader>
        <Link
          href={generateUrl({ page: `/` })}
          className="mb-4 flex max-h-32 w-full items-center justify-center text-2xl font-semibold"
        >
          {state === "expanded" ? (
            <div className="flex flex-col items-center">
              <Image
                src={`/logo.webp`}
                className="max-h-32 object-contain p-4"
                height={300}
                width={300}
                alt={"Asset2Go"}
                priority
              />
              <h2 className="">{t(`generic.title`)}</h2>
            </div>
          ) : (
            <Image
              src={`/logo.webp`}
              className="max-h-10 object-contain"
              height={300}
              width={300}
              alt={"Asset2Go"}
              priority
            />
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {Array.from(navigationMap.entries())
          .filter(([groupLabel, items]) => items.items.length > 0)
          .map(([groupLabel, items]) => (
            <SidebarGroup key={groupLabel} className={`py-0 ${state === "collapsed" ? "pb-4" : "pb-1"}`}>
              {groupLabel !== "/" && state !== "collapsed" && items.hasTitle && (
                <SidebarGroupLabel className="min-h-10 font-semibold">
                  {t(`generic.sidebar`, { type: groupLabel })}
                </SidebarGroupLabel>
              )}
              <SidebarMenu className="gap-0">
                {items.items.map((item) => {
                  if (item.url && !hasPermissionToPath(item.url)) return null;

                  const isDropdown = item.url === "#" && item.component;

                  return (
                    <Fragment key={item.title}>
                      {state === "collapsed" ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {isDropdown ? (
                              <SidebarMenuButton className="text-muted-foreground" data-testid={item.testId}>
                                {item.component}
                              </SidebarMenuButton>
                            ) : (
                              <SidebarMenuButton
                                asChild
                                className="text-muted-foreground cursor-pointer"
                                data-testid={item.testId}
                              >
                                <Link href={item.url ? item.url : "#"}>
                                  {item.icon}
                                  {item.component ? item.component : <span>{item.title}</span>}
                                </Link>
                              </SidebarMenuButton>
                            )}
                          </TooltipTrigger>
                          <TooltipContent side="right">{item.title}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <SidebarMenuButton asChild={!isDropdown} data-testid={item.testId}>
                          {isDropdown ? (
                            <div className="text-muted-foreground flex w-full items-center gap-2">
                              {item.icon}
                              {item.component}
                            </div>
                          ) : (
                            <Link href={item.url ? item.url : "#"} className="text-muted-foreground cursor-pointer">
                              {item.icon}
                              {item.component ? item.component : <span>{item.title}</span>}
                            </Link>
                          )}
                        </SidebarMenuButton>
                      )}
                    </Fragment>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
      </SidebarContent>
      <SidebarFooter>
        <UserSidebarFooter
          notificationModalOpen={notificationModalOpen}
          setNotificationModalOpen={setNotificationModalOpen}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
