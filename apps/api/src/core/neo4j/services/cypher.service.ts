import { Injectable } from "@nestjs/common";
import { DataModelInterface } from "src/common/interfaces/datamodel.interface";
import { modelRegistry } from "src/common/registries/registry";

export type RelationshipDefinition = {
  from: string;
  to: string;
  name: string;
};

@Injectable()
export class CypherService {
  private _relationships: RelationshipDefinition[] = [];

  private _initialiseRelationships(): void {
    this._relationships = [];
  }

  getRelationship(params: { from: string; to: string; relationshipName?: string }): string {
    const from: DataModelInterface<any> | undefined = modelRegistry.get(params.from);
    const to: DataModelInterface<any> | undefined = modelRegistry.get(params.to);

    if (!from) throw new Error(`Data model not found for ${params.from}`);
    if (!to) throw new Error(`Data model not found for ${params.to}`);

    if (this._relationships.length === 0) this._initialiseRelationships();

    const relationship = this._relationships.find((rel) => rel.from === from.nodeName && rel.to === to.nodeName);
    if (relationship) return `-[${params.relationshipName ? `${params.relationshipName}:` : ""}${relationship.name}]->`;

    const reverseRelationship = this._relationships.find((rel) => rel.from === to.nodeName && rel.to === from.nodeName);
    if (reverseRelationship)
      return `<-[${params.relationshipName ? `${params.relationshipName}:` : ""}:${reverseRelationship.name}]-`;

    throw new Error(`No relationship found between ${from.nodeName} and ${to.nodeName}`);
  }

  getFilter(params: { filters: { param?: any; filter: string }[] }): string {
    const filters: string[] = [];
    params.filters.forEach((filter) => {
      if (filter.param) filters.push(filter.filter.startsWith(" ") ? filter.filter : ` ${filter.filter}`);
    });
    return filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
  }
}
