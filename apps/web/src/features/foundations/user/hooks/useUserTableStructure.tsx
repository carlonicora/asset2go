"use client";

import { Link } from "@/components/custom-ui/link";
import { cellDate } from "@/features/common/components/tables/cells/cell.date";
import { cellId } from "@/features/common/components/tables/cells/cell.id";
import { TableContent, UseTableStructureHook } from "@/features/common/interfaces/table.structure.generator.interface";
import { UserFields } from "@/features/foundations/user/data/UserFields";
import { UserInterface } from "@/features/foundations/user/data/UserInterface";
import { usePageUrlGenerator } from "@/hooks/usePageUrlGenerator";
import { registerTableGenerator } from "@/hooks/useTableGenerator";
import { cn } from "@/lib/utils";
import { Modules } from "@/modules/modules";
import { ColumnDef, Row } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

export const useUserTableStructure: UseTableStructureHook<UserInterface, UserFields> = (params) => {
  const t = useTranslations();
  const generateUrl = usePageUrlGenerator();

  // Memoize tableData to prevent infinite re-renders
  const tableData = useMemo(() => {
    return params.data.map((user: UserInterface) => {
      const entry: TableContent<UserInterface> = {
        jsonApiData: user,
      };
      entry[UserFields.userId] = user.id;
      params.fields.forEach((field) => {
        entry[field] = user[field as keyof UserInterface];
      });
      return entry;
    });
  }, [params.data, params.fields]);

  const fieldColumnMap: Partial<Record<UserFields, () => any>> = {
    [UserFields.userId]: () =>
      cellId({
        name: "userId",
        checkedIds: params.checkedIds,
        toggleId: params.toggleId,
      }),
    [UserFields.name]: () => ({
      id: "name",
      accessorKey: "name",
      header: t(`foundations.user.fields.name.label`),
      cell: ({ row }: { row: Row<TableContent<UserInterface>> }) => {
        const user = row.original.jsonApiData as UserInterface;
        return (
          <Link
            href={generateUrl({ page: Modules.User, id: user.id })}
            className={cn(``, user.isDeleted || !user.isActivated ? "text-muted-foreground italic" : "")}
          >
            {user.name}
            {user.isDeleted ? ` - ${t("foundations.user.errors.deleted")}` : ""}
            {!user.isActivated ? ` - ${t("foundations.user.errors.inactive")}` : ""}
          </Link>
        );
      },
      enableSorting: false,
      enableHiding: false,
    }),
    [UserFields.email]: () => ({
      id: "email",
      accessorKey: "email",
      header: t(`foundations.user.fields.email.label`),
      cell: ({ row }: { row: Row<TableContent<UserInterface>> }) => <>{row.getValue("email")}</>,
      enableSorting: false,
      enableHiding: false,
    }),
    [UserFields.createdAt]: () =>
      cellDate({
        name: "createdAt",
        title: t(`generic.date.create`),
      }),
  };

  // Memoize columns to prevent infinite re-renders
  const columns = useMemo(() => {
    return params.fields.map((field) => fieldColumnMap[field]?.()).filter((col) => col !== undefined) as ColumnDef<
      TableContent<UserInterface>
    >[];
  }, [params.fields, fieldColumnMap, t, generateUrl]);

  // Memoize the return object to prevent infinite re-renders
  return useMemo(() => ({ data: tableData, columns: columns }), [tableData, columns]);
};

registerTableGenerator(Modules.User, useUserTableStructure);
