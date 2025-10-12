import { AbstractService, HttpMethod, NextRef, PreviousRef } from "@/data/abstracts/AbstractService";
import { EndpointCreator } from "@/data/EndpointCreator";
import { EquipmentInput, EquipmentInterface } from "@/features/features/equipment/data/EquipmentInterface";
import { Modules } from "@/modules/modules";
import { EquipmentStatus } from "@asset2go/shared";

export class EquipmentService extends AbstractService {
  static async findOne(params: { id: string }): Promise<EquipmentInterface> {
    return this.callApi<EquipmentInterface>({
      type: Modules.Equipment,
      method: HttpMethod.GET,
      endpoint: new EndpointCreator({ endpoint: Modules.Equipment, id: params.id }).generate(),
    });
  }

  static async findMany(params: {
    search?: string;
    status?: EquipmentStatus;
    expiring?: boolean;
    unassigned?: boolean;
    fetchAll?: boolean;
    next?: NextRef;
    prev?: PreviousRef;
  }): Promise<EquipmentInterface[]> {
    const endpoint = new EndpointCreator({ endpoint: Modules.Equipment });

    if (params.unassigned) endpoint.addAdditionalParam("unassigned", "true");
    if (params.expiring) endpoint.addAdditionalParam("expiring", "true");
    if (params.status) endpoint.addAdditionalParam("status", params.status);
    if (params.fetchAll) endpoint.addAdditionalParam("fetchAll", "true");
    if (params.search) endpoint.addAdditionalParam("search", params.search);
    if (Modules.Equipment.inclusions?.lists?.fields) endpoint.limitToFields(Modules.Equipment.inclusions.lists.fields);
    if (Modules.Equipment.inclusions?.lists?.types) endpoint.limitToType(Modules.Equipment.inclusions.lists.types);

    return this.callApi({
      type: Modules.Equipment,
      method: HttpMethod.GET,
      endpoint: endpoint.generate(),
      next: params.next,
    });
  }

  static async findManyBySupplier(params: {
    supplierId: string;
    search?: string;
    fetchAll?: boolean;
    next?: NextRef;
    prev?: PreviousRef;
  }): Promise<EquipmentInterface[]> {
    const endpoint = new EndpointCreator({
      endpoint: Modules.Supplier,
      id: params.supplierId,
      childEndpoint: Modules.Equipment,
    });

    if (params.fetchAll) endpoint.addAdditionalParam("fetchAll", "true");
    if (params.search) endpoint.addAdditionalParam("search", params.search);
    if (Modules.Equipment.inclusions?.lists?.fields) endpoint.limitToFields(Modules.Equipment.inclusions.lists.fields);
    if (Modules.Equipment.inclusions?.lists?.types) endpoint.limitToType(Modules.Equipment.inclusions.lists.types);

    return this.callApi({
      type: Modules.Equipment,
      method: HttpMethod.GET,
      endpoint: endpoint.generate(),
      next: params.next,
    });
  }

  static async create(params: EquipmentInput): Promise<EquipmentInterface> {
    return this.callApi({
      type: Modules.Equipment,
      method: HttpMethod.POST,
      endpoint: new EndpointCreator({ endpoint: Modules.Equipment }).generate(),
      input: params,
    });
  }

  static async update(params: EquipmentInput): Promise<EquipmentInterface> {
    return this.callApi({
      type: Modules.Equipment,
      method: HttpMethod.PUT,
      endpoint: new EndpointCreator({ endpoint: Modules.Equipment, id: params.id }).generate(),
      input: params,
    });
  }

  static async delete(params: { equipmentId: string }): Promise<void> {
    await this.callApi({
      type: Modules.Equipment,
      method: HttpMethod.DELETE,
      endpoint: new EndpointCreator({ endpoint: Modules.Equipment, id: params.equipmentId }).generate(),
    });
  }
}
