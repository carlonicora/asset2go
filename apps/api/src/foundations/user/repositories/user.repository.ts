import { Injectable, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "crypto";
import { ClsService } from "nestjs-cls";
import { JsonApiCursorInterface } from "src/core/jsonapi/interfaces/jsonapi.cursor.interface";
import { Neo4jService } from "src/core/neo4j/services/neo4j.service";
import { companyMeta } from "src/foundations/company/entities/company.meta";
import { ModuleModel } from "src/foundations/module/entities/module.model";
import { roleMeta } from "src/foundations/role/entities/role.meta";
import { RoleId } from "src/foundations/role/enums/role.id";
import { User } from "src/foundations/user/entities/user.entity";
import { userMeta } from "src/foundations/user/entities/user.meta";
import { UserModel } from "src/foundations/user/entities/user.model";
import { UserCypherService } from "src/foundations/user/services/user.cypher.service";

@Injectable()
export class UserRepository implements OnModuleInit {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly cls: ClsService,
    private readonly userCypherService: UserCypherService,
  ) {}

  async onModuleInit() {
    await this.neo4j.writeOne({
      query: `CREATE CONSTRAINT user_id IF NOT EXISTS FOR (user:User) REQUIRE user.id IS UNIQUE`,
    });

    await this.neo4j.writeOne({
      query: `CREATE CONSTRAINT user_email IF NOT EXISTS FOR (user:User) REQUIRE user.email IS UNIQUE`,
    });
  }

  async makeCompanyAdmin(params: { userId: string }) {
    const query = this.neo4j.initQuery();

    query.queryParams = {
      userId: params.userId,
      roleId: RoleId.CompanyAdministrator,
    };

    query.query = `
      MATCH (role:Role {id: $roleId})
      MATCH (user:User {id: $userId})
      MERGE (user)-[:MEMBER_OF]->(role)
    `;

    await this.neo4j.writeOne(query);
  }

  async findOneForAdmin(params: { userId: string }): Promise<User> {
    const query = this.neo4j.initQuery({ serialiser: UserModel });

    query.queryParams = {
      userId: params.userId,
    };

    query.query = `
      MATCH (user:User {id: $userId})

      OPTIONAL MATCH (user)-[:MEMBER_OF]->(user_role:Role) 
      OPTIONAL MATCH (user)-[:BELONGS_TO]->(user_company:Company)
      RETURN user, user_role, user_company
    `;

    return this.neo4j.readOne(query);
  }

  async findFullUser(params: { userId: string }): Promise<User> {
    let query = this.neo4j.initQuery({ serialiser: UserModel });

    query.queryParams = {
      ...query.queryParams,
      searchValue: params.userId,
    };

    query.query += `
      ${this.userCypherService.default({ searchField: "id" })}
      
      OPTIONAL MATCH (user)-[:MEMBER_OF]->(user_role:Role)
      OPTIONAL MATCH (user)-[:BELONGS_TO]->(user_company:Company)
      OPTIONAL MATCH (user_company)-[:HAS_FEATURE]->(user_company_feature:Feature)
      RETURN user, user_role, user_company, user_company_feature
    `;

    const user = await this.neo4j.readOne(query);

    query = this.neo4j.initQuery({ serialiser: ModuleModel });
    query.queryParams = {
      companyId: user.company?.id ?? null,
      searchValue: params.userId,
      currentUserId: params.userId,
    };

    query.query += `
      ${this.userCypherService.default({ searchField: "id" })}
      OPTIONAL MATCH (user)-[:MEMBER_OF]->(role:Role)
      MATCH (m:Module)
      WHERE $companyId IS NULL
      OR EXISTS {
        (company)-[:HAS_MODULE]->(m)
      }
      OR m.isCore = true
      OPTIONAL MATCH (role)-[perm:HAS_PERMISSIONS]->(m)
      WITH m, 
          coalesce(apoc.convert.fromJsonList(m.permissions), []) AS defaultPermissions, 
          collect(perm) AS perms
      WITH m, defaultPermissions, 
          apoc.coll.flatten([p IN perms | coalesce(apoc.convert.fromJsonList(p.permissions), [])]) AS rolePerms
      WITH m,
          head([x IN defaultPermissions WHERE x.type = 'create' | x.value]) AS defaultCreate,
          head([x IN defaultPermissions WHERE x.type = 'read'   | x.value]) AS defaultRead,
          head([x IN defaultPermissions WHERE x.type = 'update' | x.value]) AS defaultUpdate,
          head([x IN defaultPermissions WHERE x.type = 'delete' | x.value]) AS defaultDelete,
          rolePerms
      WITH m,
          [defaultCreate] + [x IN rolePerms WHERE x.type = 'create' | x.value] AS createValues,
          [defaultRead]   + [x IN rolePerms WHERE x.type = 'read'   | x.value] AS readValues,
          [defaultUpdate] + [x IN rolePerms WHERE x.type = 'update' | x.value] AS updateValues,
          [defaultDelete] + [x IN rolePerms WHERE x.type = 'delete' | x.value] AS deleteValues
      WITH m,
          CASE 
            WHEN any(x IN createValues WHERE x = true) THEN true
            WHEN any(x IN createValues WHERE x IS NOT NULL AND x <> false AND x <> true)
              THEN head([x IN createValues WHERE x IS NOT NULL AND x <> false AND x <> true])
            ELSE coalesce(head(createValues), false)
          END AS effectiveCreate,
          CASE 
            WHEN any(x IN readValues WHERE x = true) THEN true
            WHEN any(x IN readValues WHERE x IS NOT NULL AND x <> false AND x <> true)
              THEN head([x IN readValues WHERE x IS NOT NULL AND x <> false AND x <> true])
            ELSE coalesce(head(readValues), false)
          END AS effectiveRead,
          CASE 
            WHEN any(x IN updateValues WHERE x = true) THEN true
            WHEN any(x IN updateValues WHERE x IS NOT NULL AND x <> false AND x <> true)
              THEN head([x IN updateValues WHERE x IS NOT NULL AND x <> false AND x <> true])
            ELSE coalesce(head(updateValues), false)
          END AS effectiveUpdate,
          CASE 
            WHEN any(x IN deleteValues WHERE x = true) THEN true
            WHEN any(x IN deleteValues WHERE x IS NOT NULL AND x <> false AND x <> true)
              THEN head([x IN deleteValues WHERE x IS NOT NULL AND x <> false AND x <> true])
            ELSE coalesce(head(deleteValues), false)
          END AS effectiveDelete
      WITH m, apoc.convert.toJson([
              { type: "create", value: effectiveCreate },
              { type: "read",   value: effectiveRead },
              { type: "update", value: effectiveUpdate },
              { type: "delete", value: effectiveDelete }
          ]) AS newPermissions
      CALL apoc.create.vNode(
        labels(m),
        apoc.map.merge(properties(m), { permissions: newPermissions })
      ) YIELD node AS module
      
      RETURN module
    `;

    const modules = await this.neo4j.readMany(query);

    user.module = modules;

    return user;
  }

  async findByUserId(params: { userId: string; companyId?: string }): Promise<User> {
    const query = this.neo4j.initQuery({ serialiser: UserModel });

    query.queryParams = {
      ...query.queryParams,
      userId: params.userId,
    };

    if (params.companyId) query.queryParams.companyId = params.companyId;

    query.query = `
      MATCH (company:Company {id: $companyId})
      MATCH (user:User {id: $userId})-[:BELONGS_TO]->(company)
      OPTIONAL MATCH (user)-[:MEMBER_OF]->(user_role:Role) 
      OPTIONAL MATCH (user)-[:BELONGS_TO]->(user_company:Company)
      RETURN user, user_role, user_company
    `;

    return this.neo4j.readOne(query);
  }

  async findByEmail(params: { email: string; includeDeleted?: boolean }): Promise<User> {
    const query = this.neo4j.initQuery({ serialiser: UserModel });

    query.queryParams = {
      email: params.email.toLowerCase(),
    };

    query.query = `
      MATCH (${userMeta.nodeName}:User)
      WHERE toLower(${userMeta.nodeName}.email) = $email
      ${params.includeDeleted ? `` : `AND ${userMeta.nodeName}.isDeleted = false`}
      
      OPTIONAL MATCH (${userMeta.nodeName})-[:MEMBER_OF]->(${userMeta.nodeName}_${roleMeta.nodeName}:${roleMeta.labelName}) 
      OPTIONAL MATCH (${userMeta.nodeName})-[:BELONGS_TO]->(${userMeta.nodeName}_${companyMeta.nodeName}:${companyMeta.labelName})
      RETURN ${userMeta.nodeName}, ${userMeta.nodeName}_${roleMeta.nodeName}, ${userMeta.nodeName}_${companyMeta.nodeName}
    `;

    return this.neo4j.readOne(query);
  }

  async findByCode(params: { code: string }): Promise<User> {
    const query = this.neo4j.initQuery({ serialiser: UserModel });

    query.queryParams = {
      code: params.code,
    };

    query.query = `
      MATCH (user:User {code: $code, isDeleted: false}) 
      
      OPTIONAL MATCH (user)-[:MEMBER_OF]->(user_role:Role) 
      OPTIONAL MATCH (user)-[:BELONGS_TO]->(user_company:Company)
      RETURN user, user_role, user_company
    `;

    return this.neo4j.readOne(query);
  }

  async findMany(params: {
    term?: string;
    includeDeleted?: boolean;
    isDeleted?: boolean;
    cursor?: JsonApiCursorInterface;
  }): Promise<User[]> {
    const query = this.neo4j.initQuery({ serialiser: UserModel, cursor: params.cursor });

    query.queryParams = {
      ...query.queryParams,
      term: params.term,
    };

    query.query += `
     ${this.userCypherService.default()}
      ${
        params.isDeleted !== undefined
          ? `AND user.isDeleted=true`
          : params.includeDeleted === undefined || params.includeDeleted === true
            ? ``
            : `AND (user.isDeleted=false OR user.isDeleted IS NULL)`
      }
      ORDER BY user.name ASC
      {CURSOR}

      OPTIONAL MATCH (user)-[:MEMBER_OF]->(user_role:Role)
      RETURN user, user_role
    `;

    return this.neo4j.readMany(query);
  }

  async findManyByCompany(params: {
    companyId: string;
    term?: string;
    includeDeleted?: boolean;
    cursor?: JsonApiCursorInterface;
  }): Promise<User[]> {
    const query = this.neo4j.initQuery({ serialiser: UserModel, cursor: params.cursor });

    query.queryParams = {
      companyId: params.companyId,
      term: params.term,
    };

    query.query = `
      MATCH (company:Company {id: $companyId})<-[:BELONGS_TO]-(user:User)
      ${params.term ? "WHERE toLower(user.name) CONTAINS toLower($term)" : ""}
      OPTIONAL MATCH (user)-[:MEMBER_OF]->(user_role:Role)
      RETURN user, user_role
    `;

    return this.neo4j.readMany(query);
  }

  async findInRole(params: { roleId: string; term?: string; cursor: JsonApiCursorInterface }): Promise<User[]> {
    const query = this.neo4j.initQuery({ serialiser: UserModel, cursor: params.cursor });

    query.queryParams = {
      ...query.queryParams,
      roleId: params.roleId,
      term: params.term,
    };

    query.query += `
      MATCH (user:User {isDeleted: false})-[:BELONGS_TO]->(company)
      ${params.term ? "WHERE toLower(user.name) CONTAINS toLower($term)" : ""}
      MATCH (user)-[:MEMBER_OF]->(role:Role {id: $roleId})
      
      WITH user
      ORDER BY user.name ASC
      {CURSOR}
      
      OPTIONAL MATCH (user)-[:MEMBER_OF]->(user_role:Role) 
      OPTIONAL MATCH (user)-[:BELONGS_TO]->(user_company:Company)
      RETURN user, user_role, user_company
    `;

    return this.neo4j.readMany(query);
  }

  async findNotInRole(params: { roleId: string; term?: string; cursor: JsonApiCursorInterface }): Promise<User[]> {
    const query = this.neo4j.initQuery({ serialiser: UserModel, cursor: params.cursor });

    query.queryParams = {
      ...query.queryParams,
      roleId: params.roleId,
      term: params.term,
    };

    query.query += `
      MATCH (referenceRole:Role {id: $roleId})
      MATCH (user:User {isDeleted: false})-[:BELONGS_TO]->(company)
      WHERE NOT (user)-[:MEMBER_OF]->(referenceRole)
      ${params.term ? "WHERE toLower(user.name) CONTAINS toLower($term)" : ""}
      
      WITH user
      ORDER BY user.name ASC
      {CURSOR}
      
      OPTIONAL MATCH (user)-[:MEMBER_OF]->(user_role:Role) 
      OPTIONAL MATCH (user)-[:BELONGS_TO]->(user_company:Company)
      RETURN user, user_role, user_company
    `;

    return this.neo4j.readMany(query);
  }

  async create(params: {
    userId: string;
    email: string;
    name: string;
    title?: string;
    bio?: string;
    password: string;
    avatar?: string;
    companyId: string;
    roleIds: string[];
    isActive?: boolean;
    phone?: string;
  }): Promise<User> {
    const query = this.neo4j.initQuery();

    query.queryParams = {
      currentUserId: this.cls.has("userId") ? this.cls.get("userId") : null,
      userId: params.userId,
      email: params.email.toLowerCase(),
      name: params.name,
      title: params.title ?? "",
      bio: params.bio ?? "",
      password: params.password,
      isActive: params.isActive ?? false,
      phone: params.phone ?? "",
      avatar: params.avatar ?? "",
      code: randomUUID(),
      codeExpiration: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      companyId: params.companyId,
      roleIds: params.roleIds,
    };

    query.query = `
      MATCH (company:Company {id: $companyId})
      CREATE (user:User {
        id: $userId,
        email: $email,
        name: $name,
        title: $title,
        bio: $bio,
        password: $password,
        isDeleted: false,
        isActive: $isActive,
        phone: $phone,
        code: $code,
        ${params.avatar ? "avatar: $avatar," : ""}
        codeExpiration: datetime($codeExpiration),
        createdAt: datetime(),
        updatedAt: datetime()
      })-[:BELONGS_TO]->(company)
      ${
        params.roleIds && params.roleIds.length > 0
          ? `
            WITH user, company
            UNWIND $roleIds AS roleId
            MATCH (role:Role {id: roleId})
            CREATE (user)-[:MEMBER_OF]->(role)
          `
          : ""
      }
    `;

    await this.neo4j.writeOne(query);

    return this.findByUserId({ userId: params.userId, companyId: params.companyId });
  }

  async resetCode(params: { userId: string }): Promise<User> {
    const query = this.neo4j.initQuery();

    query.queryParams = {
      ...query.queryParams,
      userId: params.userId,
      code: randomUUID(),
      codeExpiration: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString(),
    };

    query.query += `
      MATCH (user:User {id: $userId})-[:BELONGS_TO]->(company)
      SET user.code=$code, user.codeExpiration=datetime($codeExpiration)
    `;

    await this.neo4j.writeOne(query);

    return this.findByUserId({ userId: params.userId });
  }

  async put(params: {
    isAdmin: boolean;
    userId: string;
    email: string;
    name: string;
    title?: string;
    bio?: string;
    password?: string;
    avatar?: string;
    roles?: string[];
    isActive?: boolean;
    phone?: string;
    preserveAvatar?: boolean;
  }): Promise<void> {
    const setClauses = [];
    setClauses.push("user.name = $name");
    setClauses.push("user.email = $email");
    setClauses.push("user.title = $title");
    setClauses.push("user.bio = $bio");
    if (!params.preserveAvatar) setClauses.push("user.avatar = $avatar");
    if (params.password !== undefined && params.password !== "") setClauses.push("user.password = $password");
    if (params.isActive !== undefined) {
      params.isActive = params.isActive ? true : false;
      setClauses.push("user.isActive = $isActive");
    }
    if (params.phone !== undefined) setClauses.push("user.phone = $phone");

    const query = this.neo4j.initQuery();

    query.queryParams = {
      ...query.queryParams,
      userId: params.userId,
      email: params.email.toLowerCase(),
      name: params.name,
      title: params.title ?? null,
      bio: params.bio ?? null,
      password: params.password,
      avatar: params.avatar ?? null,
      roleIds: params.roles,
      isActive: params.isActive,
      phone: params.phone ?? null,
    };

    query.query = `
      MATCH (company:Company {id: $companyId})
      MATCH (user:User {id: $userId})
      SET ${setClauses.join(", ")}

      ${
        params.isAdmin && params.roles !== undefined
          ? `
            // Delete outdated MEMBER_OF relationships
            WITH user
            OPTIONAL MATCH (user)-[roleRel:MEMBER_OF]->(role:Role)
            WHERE NOT role.id IN $roleIds
            DELETE roleRel

            // Add new MEMBER_OF relationships
            WITH user, $roleIds AS roleIds
            UNWIND roleIds AS roleId
            MATCH (role:Role {id: roleId})
            MERGE (user)-[:MEMBER_OF]->(role)
          `
          : ``
      }
    `;

    await this.neo4j.writeOne(query);
  }

  async reactivate(params: { userId: string }): Promise<void> {
    const query = this.neo4j.initQuery();

    query.queryParams = {
      ...query.queryParams,
      userId: params.userId,
    };

    query.query += `
      MATCH (user:User {id: $userId})
      SET user.isDeleted = false
    `;

    await this.neo4j.writeOne(query);
  }

  async patchRate(params: { userId: string; rate: number }): Promise<void> {
    const query = this.neo4j.initQuery();

    query.queryParams = {
      ...query.queryParams,
      userId: params.userId,
      rate: params.rate,
    };

    query.query += `
      MATCH (user:User {id: $userId})
      SET user.rate = $rate,
          user.updatedAt = datetime()
    `;

    await this.neo4j.writeOne(query);
  }

  async delete(params: { userId: string }): Promise<void> {
    const query = this.neo4j.initQuery();

    query.queryParams = {
      ...query.queryParams,
      userId: params.userId,
    };

    query.query = `
      MATCH (company:Company)
      MATCH (user:User {id: $userId})-[:BELONGS_TO]->(company)
        SET user.isDeleted = true
      `;

    await this.neo4j.writeOne(query);
  }

  async addUserToRole(params: { userId: string; roleId: string }): Promise<void> {
    const query = this.neo4j.initQuery();

    query.queryParams = {
      ...query.queryParams,
      roleId: params.roleId,
      userId: params.userId,
    };

    query.query += `
      MATCH (user:User {id: $userId})-[:BELONGS_TO]->(company)
      MATCH (role:Role {id: $roleId})
      CREATE (user)-[:MEMBER_OF]->(role)
    `;

    await this.neo4j.writeOne(query);
  }

  async removeUserFromRole(params: { roleId: string; userId: string }): Promise<void> {
    const query = this.neo4j.initQuery();

    query.queryParams = {
      ...query.queryParams,
      roleId: params.roleId,
      userId: params.userId,
    };

    query.query += `
      MATCH (user:User {id: $userId})-[:BELONGS_TO]->(company)
      MATCH (role:Role {id: $roleId})
      MATCH (user)-[rel:MEMBER_OF]->(role)
      DELETE rel
    `;

    await this.neo4j.writeOne(query);
  }
}
