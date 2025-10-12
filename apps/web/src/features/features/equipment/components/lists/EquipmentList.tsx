"use client";

import { ContentListTable } from "@/features/common/components/tables/ContentListTable";
import EquipmentEditor from "@/features/features/equipment/components/forms/EquipmentEditor";
import { EquipmentFields } from "@/features/features/equipment/data/EquipmentFields";
import { EquipmentInterface } from "@/features/features/equipment/data/EquipmentInterface";
import { EquipmentService } from "@/features/features/equipment/data/EquipmentService";
import "@/features/features/equipment/hooks/useEquipmentTableStructure";
import { DataListRetriever, useDataListRetriever } from "@/hooks/useDataListRetriever";
import { Modules } from "@/modules/modules";
import { EquipmentStatus } from "@asset2go/shared";
import { useTranslations } from "next-intl";
import { ReactNode } from "react";

type EquipmentListProps = {
  status?: EquipmentStatus;
};

export default function EquipmentsList({ status }: EquipmentListProps) {
  const t = useTranslations();

  const data: DataListRetriever<EquipmentInterface> = useDataListRetriever({
    module: Modules.Equipment,
    retriever: (params) => EquipmentService.findMany(params),
    retrieverParams: { status: status },
  });

  const functions: ReactNode[] = [<EquipmentEditor key="create-equipment" />];

  return (
    <ContentListTable
      data={data}
      fields={[
        EquipmentFields.name,
        EquipmentFields.supplier,
        EquipmentFields.status,
        EquipmentFields.startDate,
        EquipmentFields.endDateOverdue,
      ]}
      tableGeneratorType={Modules.Equipment}
      functions={functions}
      title={t(`types.equipments`, { count: 2 })}
    />
  );
}
