import { EquipmentStatus } from "@asset2go/shared";
import { HttpException, HttpStatus, Injectable, OnModuleInit } from "@nestjs/common";
import { JsonApiCursorInterface } from "src/core/jsonapi/interfaces/jsonapi.cursor.interface";
import { updateRelationshipQuery } from "src/core/neo4j/queries/update.relationship";
import { Neo4jService } from "src/core/neo4j/services/neo4j.service";
import { SecurityService } from "src/core/security/services/security.service";
import { Equipment } from "src/features/equipment/entities/equipment.entity";
import { equipmentMeta } from "src/features/equipment/entities/equipment.meta";
import { EquipmentModel } from "src/features/equipment/entities/equipment.model";
import { EquipmentCypherService } from "src/features/equipment/services/equipment.cypher.service";
import { loanMeta } from "src/features/loan/entities/loan.meta";
import { supplierMeta } from "src/features/supplier/entities/supplier.meta";

@Injectable()
export class EquipmentRepository implements OnModuleInit {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly equipmentCypherService: EquipmentCypherService,
    private readonly securityService: SecurityService,
  ) {}

  async onModuleInit() {
    await this.neo4j.writeOne({
      query: `CREATE CONSTRAINT ${equipmentMeta.nodeName}_id IF NOT EXISTS FOR (${equipmentMeta.nodeName}:${equipmentMeta.labelName}) REQUIRE ${equipmentMeta.nodeName}.id IS UNIQUE`,
    });

    const indexName = "equipment_search_index";
    const expectedProperties = ["name", "barcode", "description"];

    const result = await this.neo4j.read(
      `
    SHOW INDEXES
    YIELD name, type, entityType, labelsOrTypes, properties
    WHERE name = $indexName AND type = 'FULLTEXT' AND entityType = 'NODE'
    RETURN labelsOrTypes AS labels, properties
  `,
      { indexName },
    );

    const match = result.records[0];
    const labels = match?.get("labels") ?? [];
    const properties = match?.get("properties") ?? [];

    const arraysEqual = (a, b) => a.length === b.length && a.every((val) => b.includes(val));

    if (!match || !arraysEqual(labels, [equipmentMeta.labelName]) || !arraysEqual(properties, expectedProperties)) {
      await this.neo4j.writeOne({
        query: `
          CREATE FULLTEXT INDEX \`${indexName}\` IF NOT EXISTS
          FOR (n:${[equipmentMeta.labelName].map((l) => `\`${l}\``).join(" | ")})
          ON EACH [${expectedProperties.map((p) => `n.\`${p}\``).join(", ")}]
        `,
        queryParams: {},
      });
    }
  }

  private async _validateForbidden(params: {
    response: Equipment | null;
    searchField: string;
    searchValue: string;
  }): Promise<Equipment | null> {
    if (params.response) return params.response;

    const existsQuery = this.neo4j.initQuery({ serialiser: EquipmentModel });
    existsQuery.queryParams = { companyId: null, currentUserId: null, searchValue: params.searchValue };
    existsQuery.query = `
      ${this.equipmentCypherService.default({ searchField: "id", blockCompanyAndUser: true })}
      ${this.equipmentCypherService.returnStatement()}
    `;
    const exists = await this.neo4j.readOne(existsQuery);

    if (exists) throw new HttpException(`Forbidden`, HttpStatus.FORBIDDEN);
  }

  async find(params: {
    fetchAll?: boolean;
    term?: string;
    orderBy?: string;
    status?: EquipmentStatus;
    cursor?: JsonApiCursorInterface;
  }): Promise<Equipment[]> {
    const query = this.neo4j.initQuery({
      cursor: params.cursor,
      serialiser: EquipmentModel,
      fetchAll: params.fetchAll,
    });

    query.queryParams = {
      ...query.queryParams,
      term: params.term,
      status: params.status,
    };

    if (params.term) {
      query.query += `CALL db.index.fulltext.queryNodes("equipment_search_index", $term)
      YIELD node, score
      WHERE (node)-[:BELONGS_TO]->(company)

      WITH node as equipment, score
      ORDER BY score DESC
    `;
    } else {
      query.query += `
      ${this.equipmentCypherService.default()}
      ${this.securityService.userHasAccess({ validator: this.equipmentCypherService.userHasAccess })}
      
      ORDER BY ${equipmentMeta.nodeName}.${params.orderBy ? `${params.orderBy}` : `updatedAt DESC`}
    `;
    }

    query.query += `
      ${params.status ? `WHERE equipment.status = $status` : ``}
      {CURSOR}

      ${this.equipmentCypherService.returnStatement()}
    `;

    return this.neo4j.readMany(query);
  }

  async findExpiring(params: { cursor?: JsonApiCursorInterface }): Promise<Equipment[]> {
    const query = this.neo4j.initQuery({
      cursor: params.cursor,
      serialiser: EquipmentModel,
    });

    query.query += `
      ${this.equipmentCypherService.default()}
      WHERE ${equipmentMeta.nodeName}.endDate IS NOT NULL AND date(${equipmentMeta.nodeName}.endDate) <= date() + duration({months: 1})
      ${this.securityService.userHasAccess({ validator: this.equipmentCypherService.userHasAccess })}
      
      ORDER BY ${equipmentMeta.nodeName}.endDate DESC
      {CURSOR}

      ${this.equipmentCypherService.returnStatement()}
    `;

    return this.neo4j.readMany(query);
  }

  async findActive(): Promise<Equipment[]> {
    const query = this.neo4j.initQuery({
      serialiser: EquipmentModel,
      fetchAll: true,
    });

    query.queryParams = { ...query.queryParams, status: EquipmentStatus.Available };

    query.query += `
      ${this.equipmentCypherService.default()}
      WHERE ${equipmentMeta.nodeName}.status = $status
      ${this.securityService.userHasAccess({ validator: this.equipmentCypherService.userHasAccess })}
      
      {CURSOR}

      ${this.equipmentCypherService.returnStatement()}
    `;

    return this.neo4j.readMany(query);
  }

  async findUnassigned(params: { cursor?: JsonApiCursorInterface }): Promise<Equipment[]> {
    const query = this.neo4j.initQuery({
      cursor: params.cursor,
      serialiser: EquipmentModel,
    });

    query.query += `
      ${this.equipmentCypherService.default()}
      WHERE NOT EXISTS{ MATCH (${equipmentMeta.nodeName})-[:LOANED_THROUGH]->(${equipmentMeta.nodeName}_${loanMeta.nodeName}:${loanMeta.labelName}) }
      ${this.securityService.userHasAccess({ validator: this.equipmentCypherService.userHasAccess })}
      
      ORDER BY ${equipmentMeta.nodeName}.endDate DESC
      {CURSOR}

      ${this.equipmentCypherService.returnStatement()}
    `;

    return this.neo4j.readMany(query);
  }

  async findById(params: { id: string }): Promise<Equipment> {
    const query = this.neo4j.initQuery({ serialiser: EquipmentModel });

    query.queryParams = {
      ...query.queryParams,
      searchValue: params.id,
    };

    query.query += `
      ${this.equipmentCypherService.default({ searchField: "id" })}
      ${this.securityService.userHasAccess({ validator: this.equipmentCypherService.userHasAccess })}
      ${this.equipmentCypherService.returnStatement()}
    `;

    return this._validateForbidden({
      response: await this.neo4j.readOne(query),
      searchField: "id",
      searchValue: params.id,
    });
  }

  async updateMetadata(params: {
    id: string;
    name?: string;
    description?: string;
    manufacturer?: string;
    model?: string;
    category?: string;
    imageUrl?: string;
  }): Promise<void> {
    const query = this.neo4j.initQuery();

    query.queryParams = {
      ...query.queryParams,
      id: params.id,
      name: params.name ?? "",
      description: params.description ?? "",
      manufacturer: params.manufacturer ?? "",
      model: params.model ?? "",
      category: params.category ?? "",
      imageUrl: params.imageUrl ?? "",
    };

    const setParams: string[] = [];
    if (params.name) setParams.push("equipment.name = $name");
    if (params.description) setParams.push("equipment.description = $description");
    if (params.manufacturer) setParams.push("equipment.manufacturer = $manufacturer");
    if (params.model) setParams.push("equipment.model = $model");
    if (params.category) setParams.push("equipment.category = $category");
    if (params.imageUrl) setParams.push("equipment.imageUrl = $imageUrl");
    const set = setParams.join(", ");

    query.query += `
      MATCH (equipment:Equipment { id: $id })
      SET ${set},
          equipment.updatedAt = datetime()
    `;

    await this.neo4j.writeOne(query);
  }

  async create(params: {
    id: string;
    name: string;
    barcode?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    status: EquipmentStatus;
    supplierIds: string;
  }): Promise<void> {
    const query = this.neo4j.initQuery();

    await this.neo4j.validateExistingNodes({
      nodes: [{ id: params.supplierIds, label: supplierMeta.labelName }],
    });

    query.queryParams = {
      ...query.queryParams,
      id: params.id,
      name: params.name,
      barcode: params.barcode ?? "",
      description: params.description ?? "",
      startDate: params.startDate ? params.startDate.split("T")[0] : null,
      endDate: params.endDate ? params.endDate.split("T")[0] : null,
      status: params.status,
      supplierIds: [params.supplierIds],
    };

    query.query += `
      CREATE (equipment:Equipment {
        id: $id,
        name: $name,
        barcode: $barcode,
        description: $description,
        ${params.startDate ? `startDate: date($startDate),` : ``}
        ${params.endDate ? `endDate: date($endDate),` : ``}
        status: $status,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      CREATE (equipment)-[:BELONGS_TO]->(company)
    `;

    const relationships = [
      { relationshipName: "SUPPLIES", param: "supplierIds", label: supplierMeta.labelName, relationshipToNode: false },
    ];

    relationships.forEach(({ relationshipName, param, label, relationshipToNode }) => {
      query.query += updateRelationshipQuery({
        node: equipmentMeta.nodeName,
        relationshipName: relationshipName,
        relationshipToNode: relationshipToNode,
        label: label,
        param: param,
        values: params[param],
      });
    });

    await this.neo4j.writeOne(query);
  }

  async put(params: {
    id: string;
    name: string;
    barcode?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    supplierIds: string;
    status: EquipmentStatus;
  }): Promise<void> {
    const query = this.neo4j.initQuery();

    await this.neo4j.validateExistingNodes({
      nodes: [{ id: params.supplierIds, label: supplierMeta.labelName }],
    });

    query.queryParams = {
      ...query.queryParams,
      id: params.id,
      name: params.name ?? "",
      barcode: params.barcode ?? "",
      description: params.description ?? "",
      startDate: params.startDate ? params.startDate.split("T")[0] : null,
      endDate: params.endDate ? params.endDate.split("T")[0] : null,
      supplierIds: [params.supplierIds],
      status: params.status,
    };

    const setParams: string[] = [];
    setParams.push("equipment.name = $name");
    setParams.push("equipment.barcode = $barcode");
    setParams.push("equipment.description = $description");
    setParams.push(`equipment.startDate = ${params.startDate ? `date($startDate)` : `null`}`);
    setParams.push(`equipment.endDate = ${params.endDate ? `date($endDate)` : `null`}`);
    setParams.push("equipment.status = $status");
    const set = setParams.join(", ");

    query.query += `
      MATCH (equipment:Equipment {id: $id})-[:BELONGS_TO]->(company)
      SET equipment.updatedAt = datetime(),
      ${set}
    `;

    const relationships = [
      { relationshipName: "SUPPLIES", param: "supplierIds", label: supplierMeta.labelName, relationshipToNode: false },
    ];

    relationships.forEach(({ relationshipName, param, label, relationshipToNode }) => {
      query.query += updateRelationshipQuery({
        node: equipmentMeta.nodeName,
        relationshipName: relationshipName,
        relationshipToNode: relationshipToNode,
        label: label,
        param: param,
        values: params[param] ? (Array.isArray(params[param]) ? params[param] : [params[param]]) : [],
      });
    });

    await this.neo4j.writeOne(query);
  }

  async delete(params: { id: string }): Promise<void> {
    const query = this.neo4j.initQuery();

    query.queryParams = {
      ...query.queryParams,
      id: params.id,
    };

    query.query += `
      MATCH (equipment:Equipment {id: $id})-[:BELONGS_TO]->(company)
      DETACH DELETE equipment;
    `;

    await this.neo4j.writeOne(query);
  }

  async findBySupplier(params: {
    supplierId: string;
    term?: string;
    orderBy?: string;
    fetchAll?: boolean;
    cursor?: JsonApiCursorInterface;
  }) {
    const query = this.neo4j.initQuery({
      serialiser: EquipmentModel,
      cursor: params.cursor,
      fetchAll: params.fetchAll,
    });

    query.queryParams = {
      ...query.queryParams,
      supplierId: params.supplierId,
      term: params.term,
    };

    if (params.term) {
      query.query += `
        CALL db.index.fulltext.queryNodes("equipment_search_index", $term)
        YIELD node, score
        WHERE (node)-[:BELONGS_TO]->(company)

        WITH node as ${equipmentMeta.nodeName}, score
        ORDER BY score DESC
      `;
    } else {
      query.query += `
      ${this.equipmentCypherService.default()}
      ${this.securityService.userHasAccess({ validator: this.equipmentCypherService.userHasAccess })}
      
      ORDER BY ${equipmentMeta.nodeName}.${params.orderBy ? `${params.orderBy}` : `updatedAt DESC`}
    `;
    }

    query.query += `
      MATCH (${equipmentMeta.nodeName})<-[:SUPPLIES]-(:${supplierMeta.labelName} {id: $supplierId})
      {CURSOR}

      ${this.equipmentCypherService.returnStatement()}
    `;

    return this.neo4j.readMany(query);
  }
}
