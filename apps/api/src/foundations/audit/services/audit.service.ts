import { Injectable } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { JsonApiPaginator } from "src/core/jsonapi/serialisers/jsonapi.paginator";
import { JsonApiService } from "src/core/jsonapi/services/jsonapi.service";
import { auditModel } from "src/foundations/audit/entities/audit.model";
import { AuditRepository } from "src/foundations/audit/repositories/audit.repository";

const skipAuditLog = true;
@Injectable()
export class AuditService {
  constructor(
    private readonly builder: JsonApiService,
    private readonly auditRepository: AuditRepository,
    private readonly clsService: ClsService,
  ) {}

  async createAuditEntry(params: { entityType: string; entityId: string }): Promise<void> {
    //TODO: Enable audit logs
    if (skipAuditLog === true) return; // Audit log disabled for now

    const userId = this.clsService.get("userId");
    if (!userId) return;

    await this.auditRepository.create({
      userId: userId,
      entityType: params.entityType,
      entityId: params.entityId,
      auditType: "read",
    });
  }

  async findByUser(params: { query: any; userId: string }): Promise<void> {
    const paginator: JsonApiPaginator = new JsonApiPaginator(params.query);

    try {
      return this.builder.buildList(
        auditModel,
        await this.auditRepository.findByUser({ userId: params.userId, cursor: paginator.generateCursor() }),
        paginator,
      );
    } catch (error) {
      console.error("Error in findByUser:", error);
      throw error;
    }
  }
}
