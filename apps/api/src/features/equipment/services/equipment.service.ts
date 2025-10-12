import { EquipmentStatus } from "@asset2go/shared";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { JsonApiDataInterface } from "src/core/jsonapi/interfaces/jsonapi.data.interface";
import { JsonApiPaginator } from "src/core/jsonapi/serialisers/jsonapi.paginator";
import { JsonApiService } from "src/core/jsonapi/services/jsonapi.service";
import { EquipmentPostDataDTO } from "src/features/equipment/dtos/equipment.post.dto";
import { EquipmentPutDataDTO } from "src/features/equipment/dtos/equipment.put.dto";
import { EquipmentModel } from "src/features/equipment/entities/equipment.model";
import { EquipmentRepository } from "src/features/equipment/repositories/equipment.repository";

@Injectable()
export class EquipmentService {
  constructor(
    private readonly builder: JsonApiService,
    private readonly equipmentRepository: EquipmentRepository,
    private readonly clsService: ClsService,
  ) {}

  async find(params: {
    query: any;
    term?: string;
    fetchAll?: boolean;
    orderBy?: string;
    status?: EquipmentStatus;
    expiring?: boolean;
    unassigned?: boolean;
  }): Promise<JsonApiDataInterface> {
    const paginator: JsonApiPaginator = new JsonApiPaginator(params.query);

    return this.builder.buildList(
      EquipmentModel,
      params.expiring
        ? await this.equipmentRepository.findExpiring({
            cursor: paginator.generateCursor(),
          })
        : params.unassigned
          ? await this.equipmentRepository.findUnassigned({
              cursor: paginator.generateCursor(),
            })
          : await this.equipmentRepository.find({
              fetchAll: params.fetchAll,
              term: params.term,
              orderBy: params.orderBy,
              status: params.status,
              cursor: paginator.generateCursor(),
            }),
      paginator,
    );
  }

  async findById(params: { id: string }): Promise<JsonApiDataInterface> {
    return this.builder.buildSingle(
      EquipmentModel,
      await this.equipmentRepository.findById({
        id: params.id,
      }),
    );
  }

  async create(params: { data: EquipmentPostDataDTO }): Promise<JsonApiDataInterface> {
    await this.equipmentRepository.create({
      id: params.data.id,
      name: params.data.attributes.name,
      barcode: params.data.attributes.barcode,
      description: params.data.attributes.description,
      startDate: params.data.attributes.startDate,
      endDate: params.data.attributes.endDate,
      status: params.data.attributes.status,
      supplierIds: params.data.relationships.supplier.data.id,
    });

    return this.findById({ id: params.data.id });
  }

  async put(params: { data: EquipmentPutDataDTO }): Promise<JsonApiDataInterface> {
    await this.equipmentRepository.put({
      id: params.data.id,
      name: params.data.attributes.name,
      barcode: params.data.attributes.barcode,
      description: params.data.attributes.description,
      startDate: params.data.attributes.startDate,
      endDate: params.data.attributes.endDate,
      status: params.data.attributes.status,
      supplierIds: params.data.relationships.supplier.data.id,
    });

    return this.findById({ id: params.data.id });
  }

  async delete(params: { id: string }): Promise<void> {
    const equipment = await this.equipmentRepository.findById({ id: params.id });
    if (!equipment) throw new NotFoundException();

    if (!this.clsService.get("userId") || (this.clsService.get("companyId") ?? "") !== equipment.company.id)
      throw new ForbiddenException();

    await this.equipmentRepository.delete({ id: params.id });
  }

  async findBySupplier(params: {
    supplierId: string;
    query: any;
    term?: string;
    fetchAll?: boolean;
    orderBy?: string;
  }) {
    const paginator: JsonApiPaginator = new JsonApiPaginator(params.query);

    return this.builder.buildList(
      EquipmentModel,
      await this.equipmentRepository.findBySupplier({
        supplierId: params.supplierId,
        fetchAll: params.fetchAll,
        term: params.term,
        orderBy: params.orderBy,
        cursor: paginator.generateCursor(),
      }),
      paginator,
    );
  }
}
