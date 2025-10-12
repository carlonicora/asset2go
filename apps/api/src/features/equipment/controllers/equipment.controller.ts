import { EquipmentStatus } from "@asset2go/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  PreconditionFailedException,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { FastifyReply } from "fastify";

import { JwtAuthGuard } from "src/common/guards/jwt.auth.guard";
import { AuthenticatedRequest } from "src/common/interfaces/authenticated.request.interface";
import { CacheService } from "src/core/cache/services/cache.service";
import { EquipmentPostDTO } from "src/features/equipment/dtos/equipment.post.dto";
import { EquipmentPutDTO } from "src/features/equipment/dtos/equipment.put.dto";
import { equipmentMeta } from "src/features/equipment/entities/equipment.meta";
import { EquipmentRepository } from "src/features/equipment/repositories/equipment.repository";
import { EquipmentMetadataService } from "src/features/equipment/services/equipment.metadata.service";
import { EquipmentService } from "src/features/equipment/services/equipment.service";
import { supplierMeta } from "src/features/supplier/entities/supplier.meta";
import { AuditService } from "src/foundations/audit/services/audit.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class EquipmentController {
  constructor(
    private readonly equipmentService: EquipmentService,
    private readonly equipmentRepository: EquipmentRepository,
    private readonly equipmentMetadataService: EquipmentMetadataService,
    private readonly cacheService: CacheService,
    private readonly auditService: AuditService,
  ) {}

  @Get(equipmentMeta.endpoint)
  async findEquipments(
    @Req() req: AuthenticatedRequest,
    @Res() reply: FastifyReply,
    @Query() query: any,
    @Query("search") search?: string,
    @Query("fetchAll") fetchAll?: boolean,
    @Query("orderBy") orderBy?: string,
    @Query("status") status?: EquipmentStatus,
    @Query("expiring") expiring?: boolean,
    @Query("unassigned") unassigned?: boolean,
  ) {
    const response = await this.equipmentService.find({
      term: search,
      query: query,
      fetchAll: fetchAll,
      orderBy: orderBy,
      status: status,
      expiring: expiring,
      unassigned: unassigned,
    });

    reply.send(response);
  }

  @Get(`${equipmentMeta.endpoint}/:equipmentId`)
  async findById(
    @Req() req: AuthenticatedRequest,
    @Res() reply: FastifyReply,
    @Param("equipmentId") equipmentId: string,
  ) {
    const response = await this.equipmentService.findById({
      id: equipmentId,
    });

    reply.send(response);

    this.auditService.createAuditEntry({ entityType: equipmentMeta.labelName, entityId: equipmentId });
  }

  @Post(equipmentMeta.endpoint)
  async createEquipment(@Req() req: AuthenticatedRequest, @Res() reply: FastifyReply, @Body() body: EquipmentPostDTO) {
    const response = await this.equipmentService.create({
      data: body.data,
    });

    reply.send(response);

    await this.equipmentMetadataService.fetchMetadata({
      equipmentId: body.data.id,
      barcode: body.data.attributes.barcode,
    });
    await this.cacheService.invalidateByType(equipmentMeta.endpoint);
  }

  @Put(`${equipmentMeta.endpoint}/:equipmentId`)
  async updateEquipment(
    @Req() req: AuthenticatedRequest,
    @Res() reply: FastifyReply,
    @Param("equipmentId") equipmentId: string,
    @Body() body: EquipmentPutDTO,
  ) {
    if (equipmentId !== body.data.id)
      throw new PreconditionFailedException("Equipment ID in the URL does not match the ID in the body");

    const equipment = await this.equipmentRepository.findById({ id: equipmentId });
    const response = await this.equipmentService.put({
      data: body.data,
    });

    reply.send(response);

    await this.equipmentMetadataService.fetchMetadata({
      equipmentId: body.data.id,
      existingBarcode: equipment.barcode,
      barcode: body.data.attributes.barcode,
    });
    await this.cacheService.invalidateByElement(equipmentMeta.endpoint, equipmentId);
  }

  @Delete(`${equipmentMeta.endpoint}/:equipmentId`)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEquipment(
    @Req() req: AuthenticatedRequest,
    @Res() reply: FastifyReply,
    @Param("equipmentId") equipmentId: string,
  ) {
    await this.equipmentService.delete({ id: equipmentId });
    reply.send();

    await this.cacheService.invalidateByElement(equipmentMeta.endpoint, equipmentId);
  }

  @Get(`${supplierMeta.endpoint}/:supplierId/${equipmentMeta.endpoint}`)
  async findBySupplier(
    @Req() req: AuthenticatedRequest,
    @Res() reply: FastifyReply,
    @Param("supplierId") supplierId: string,
    @Query() query: any,
    @Query("search") search?: string,
    @Query("fetchAll") fetchAll?: boolean,
    @Query("orderBy") orderBy?: string,
  ) {
    const response = await this.equipmentService.findBySupplier({
      supplierId: supplierId,
      term: search,
      query: query,
      fetchAll: fetchAll,
      orderBy: orderBy,
    });

    reply.send(response);
  }
}
