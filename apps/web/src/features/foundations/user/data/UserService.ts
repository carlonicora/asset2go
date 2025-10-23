import { AbstractService, HttpMethod, NextRef, PreviousRef } from "@/data/abstracts/AbstractService";
import { EndpointCreator } from "@/data/EndpointCreator";
import { Modules } from "@/modules/modules";
import { UserInput, UserInterface } from "./UserInterface";

export class UserService extends AbstractService {
  static async findFullUser(): Promise<UserInterface> {
    const endpoint = new EndpointCreator({ endpoint: Modules.User, id: "me", childEndpoint: "full" });

    return this.callApi<UserInterface>({
      type: Modules.User,
      method: HttpMethod.GET,
      endpoint: endpoint.generate(),
    });
  }

  static async findById(params: { userId: string }): Promise<UserInterface> {
    return this.callApi<UserInterface>({
      type: Modules.User,
      method: HttpMethod.GET,
      endpoint: new EndpointCreator({ endpoint: Modules.User, id: params.userId }).generate(),
    });
  }

  static async findByEmail(params: { email: string }): Promise<UserInterface> {
    const endpoint = new EndpointCreator({ endpoint: Modules.User, id: "email", childEndpoint: params.email });

    return this.callApi<UserInterface>({ type: Modules.User, method: HttpMethod.GET, endpoint: endpoint.generate() });
  }

  static async findMany(params: {
    roleId?: string;
    search?: string;
    fetchAll?: boolean;
    includeDeleted?: boolean;
    next?: NextRef;
    prev?: PreviousRef;
  }): Promise<UserInterface[]> {
    const endpoint = new EndpointCreator({ endpoint: Modules.User });

    if (params.roleId) endpoint.addAdditionalParam("roleId", params.roleId);

    if (params.includeDeleted) endpoint.addAdditionalParam("includeDeleted", "true");
    if (params.fetchAll) endpoint.addAdditionalParam("fetchAll", "true");
    if (params.search) endpoint.addAdditionalParam("search", params.search);

    return this.callApi({
      type: Modules.User,
      method: HttpMethod.GET,
      endpoint: endpoint.generate(),
      next: params.next,
    });
  }

  static async findManyForAmin(params: {
    companyId?: string;
    search?: string;
    next?: NextRef;
    prev?: PreviousRef;
  }): Promise<UserInterface[]> {
    if (!params.companyId) return [];

    const endpoint = new EndpointCreator({
      endpoint: Modules.Company,
      id: params.companyId,
      childEndpoint: Modules.User,
    });

    if (params.search) endpoint.addAdditionalParam("search", params.search);

    return this.callApi({
      type: Modules.User,
      method: HttpMethod.GET,
      endpoint: endpoint.generate(),
      next: params.next,
      previous: params.prev,
    });
  }

  static async findAllUsers(params: {
    companyId: string;
    search?: string;
    limitToRoles?: string[];
    isDeleted?: boolean;
    next?: NextRef;
    prev?: PreviousRef;
  }): Promise<UserInterface[]> {
    const endpoint = new EndpointCreator({ endpoint: Modules.User });

    if (params.search) endpoint.addAdditionalParam("search", params.search);
    if (params.isDeleted) endpoint.addAdditionalParam("isDeleted", "true");
    else endpoint.addAdditionalParam("includeDeleted", "false");
    if (params.limitToRoles && params.limitToRoles.length > 0)
      endpoint.addAdditionalParam("limitToRoles", params.limitToRoles.join(","));

    return this.callApi({
      type: Modules.User,
      method: HttpMethod.GET,
      endpoint: endpoint.generate(),
      companyId: params.companyId,
      next: params.next,
    });
  }

  static async findAllUsersByRole(params: {
    roleId: string;
    search?: string;
    next?: NextRef;
    prev?: PreviousRef;
  }): Promise<UserInterface[]> {
    const endpoint = new EndpointCreator({ endpoint: Modules.Role, id: params.roleId, childEndpoint: Modules.User });

    if (params.search) endpoint.addAdditionalParam("search", params.search);

    return this.callApi({
      type: Modules.User,
      method: HttpMethod.GET,
      endpoint: endpoint.generate(),
      next: params.next,
    });
  }

  static async findAllUsersNotInRole(params: {
    roleId: string;
    search?: string;
    next?: NextRef;
    prev?: PreviousRef;
  }): Promise<UserInterface[]> {
    const endpoint = new EndpointCreator({
      endpoint: Modules.Role,
      id: params.roleId,
      childEndpoint: Modules.User,
    }).addAdditionalParam("notInRole", "true");

    if (params.search) endpoint.addAdditionalParam("search", params.search);

    return this.callApi({
      type: Modules.User,
      method: HttpMethod.GET,
      endpoint: endpoint.generate(),
      next: params.next,
    });
  }

  static async create(params: UserInput): Promise<UserInterface> {
    return this.callApi({
      type: Modules.User,
      method: HttpMethod.POST,
      endpoint: new EndpointCreator({ endpoint: Modules.User }).generate(),
      companyId: params.companyId,
      input: params,
    });
  }

  static async reactivate(params: { userId: string }): Promise<UserInterface> {
    return this.callApi({
      type: Modules.User,
      method: HttpMethod.PATCH,
      endpoint: new EndpointCreator({ endpoint: Modules.User, id: params.userId }).generate(),
    });
  }

  static async sendInvitation(params: { userId: string }): Promise<void> {
    this.callApi({
      type: Modules.User,
      method: HttpMethod.POST,
      endpoint: new EndpointCreator({
        endpoint: Modules.User,
        id: params.userId,
        childEndpoint: "send-invitation-email",
      }).generate(),
    });
  }

  static async update(params: UserInput): Promise<UserInterface> {
    return this.callApi({
      type: Modules.User,
      method: HttpMethod.PUT,
      endpoint: new EndpointCreator({ endpoint: Modules.User, id: params.id }).generate(),
      companyId: params.companyId,
      input: params,
    });
  }

  static async patchRate(params: UserInput): Promise<UserInterface> {
    return this.callApi({
      type: Modules.User,
      method: HttpMethod.PATCH,
      endpoint: new EndpointCreator({ endpoint: Modules.User, id: params.id, childEndpoint: "rates" }).generate(),
      companyId: params.companyId,
      input: params,
    });
  }

  static async delete(params: { userId: string; companyId: string }): Promise<void> {
    await this.callApi({
      type: Modules.User,
      method: HttpMethod.DELETE,
      endpoint: new EndpointCreator({ endpoint: Modules.User, id: params.userId }).generate(),
      companyId: params.companyId,
    });
  }
}
