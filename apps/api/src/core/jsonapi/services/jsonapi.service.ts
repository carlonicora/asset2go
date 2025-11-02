import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { BaseConfigInterface } from "src/common/config/interfaces/base.config.interface";
import { ConfigApiInterface } from "src/common/config/interfaces/config.api.interface";
import { DataModelInterface } from "src/common/interfaces/datamodel.interface";
import { JsonApiSerialiserFactory } from "src/core/jsonapi/factories/jsonapi.serialiser.factory";
import { JsonApiDataInterface } from "src/core/jsonapi/interfaces/jsonapi.data.interface";
import { JsonApiPaginator } from "src/core/jsonapi/serialisers/jsonapi.paginator";
import { JsonApiIncludedFields } from "src/core/jsonapi/types/JsonApiIncludedFields";
import { AppLoggingService } from "src/core/logging/services/logging.service";

@Injectable()
export class JsonApiService {
  constructor(
    private readonly config: ConfigService<BaseConfigInterface>,
    private readonly serialiserFactory: JsonApiSerialiserFactory,
    private readonly logger: AppLoggingService,
  ) {}

  async buildSingle<T extends DataModelInterface<any>>(model: T, record: any): Promise<any> {
    const builder = this.serialiserFactory.create(model);
    if (!record) throw new HttpException(`not found`, HttpStatus.NOT_FOUND);

    if (typeof record[`${builder.id}`] === "string")
      return await this.serialise(
        record,
        builder.create(),
        `${this.config.get<ConfigApiInterface>("api").url}${builder.endpoint}/${record[`${builder.id}`]}`,
      );

    return await this.serialise(
      record,
      builder.create(),
      `${this.config.get<ConfigApiInterface>("api").url}${builder.endpoint}/${record[`${builder.id}`]}`,
    );
  }

  async buildList<T extends DataModelInterface<any>>(
    model: T,
    records: any[],
    paginator?: JsonApiPaginator,
  ): Promise<any> {
    const builder = this.serialiserFactory.create(model);

    return await this.serialise(
      records,
      builder.create(),
      `${this.config.get<ConfigApiInterface>("api").url}${builder.endpoint}${builder.endpointParameters}`,
      paginator,
    );
  }

  private _addToIncluded(includedElements: any[], newElements: any[], paginator?: JsonApiPaginator) {
    const uniqueIdentifiers = new Set(includedElements.map((e) => `${e.type}-${e.id}`));

    newElements.forEach((element) => {
      if (paginator && paginator.includedType.length > 0 && !paginator.includedType.includes(element.type)) return;
      const identifier = `${element.type}-${element.id}`;

      if (!uniqueIdentifiers.has(identifier)) {
        includedElements.push(element);
        uniqueIdentifiers.add(identifier);
      }
    });
  }

  async serialise<T, R extends JsonApiDataInterface>(
    data: T | T[],
    builder: R,
    url: string,
    paginator?: JsonApiPaginator,
  ): Promise<JsonApiDataInterface> {
    const response: any = {
      links: {
        self: url,
      },
      data: undefined,
    };

    if (paginator && Array.isArray(data) && data.length <= paginator.size) {
      if (url) {
        const links = paginator.generateLinks(data, url);
        response.links.self = links.self;
        if (links.next) response.links.next = links.next;
        if (links.previous) response.links.prev = links.previous;
      } else {
        delete response.links;
      }
    }

    const included: any[] = [];

    if (Array.isArray(data)) {
      const serialisedResults = await Promise.all(data.map((item: T) => this.serialiseData(item, builder, paginator)));

      response.data = serialisedResults.map((result) => result.serialisedData);

      this._addToIncluded(
        included,
        ([] as any[]).concat(...serialisedResults.map((result) => result.includedElements)),
      );
    } else {
      const { serialisedData, includedElements } = await this.serialiseData(data, builder, paginator);
      response.data = serialisedData;
      this._addToIncluded(included, includedElements);
    }

    if (included.length > 0) response.included = included;

    return response;
  }

  private async serialiseData<T, R extends JsonApiDataInterface>(
    data: T,
    builder: R,
    paginator?: JsonApiPaginator,
  ): Promise<{
    serialisedData: any | any[];
    includedElements: any[];
  }> {
    const includedElements: any[] = [];
    const serialisedData: any = {
      type: builder.type,
    };

    if (typeof builder.id === "function") {
      serialisedData.id = builder.id(data);
    } else {
      serialisedData.id = data[builder.id];
    }

    if (builder.links) {
      serialisedData.links = {
        self: builder.links.self(data),
      };
    }

    serialisedData.attributes = {};

    for (const attribute of Object.keys(builder.attributes)) {
      let includedField;
      if (paginator) {
        includedField = paginator.includedFields.find(
          (includedField: JsonApiIncludedFields) => includedField.type === builder.type,
        );
      }
      if (!paginator || !includedField || (includedField && includedField.fields.includes(attribute))) {
        if (typeof builder.attributes[attribute] === "function") {
          serialisedData.attributes[attribute] = await builder.attributes[attribute](data);
        } else {
          serialisedData.attributes[attribute] = data[attribute];
        }
      }
    }

    if (builder.meta) {
      serialisedData.meta = {};
      for (const meta of Object.keys(builder.meta)) {
        if (typeof builder.meta[meta] === "function") {
          serialisedData.meta[meta] = await builder.meta[meta](data);
        } else {
          serialisedData.meta[meta] = data[meta];
        }
      }
    }

    if (builder.relationships) {
      serialisedData.relationships = {};

      for (const [key, relationship] of Object.entries(builder.relationships)) {
        let resourceLinkage: any = {};
        const manyToManyRelationships = key.split("__");

        if (relationship.resourceIdentifier) {
          const minimalData: any = {
            type: relationship.resourceIdentifier.type,
          };

          try {
            if (typeof relationship.resourceIdentifier.id === "function") {
              minimalData.id = relationship.resourceIdentifier.id(data);
            } else {
              minimalData.id = data[relationship.resourceIdentifier.id];
            }

            resourceLinkage = {
              data: minimalData,
            };
            if (relationship.links) {
              resourceLinkage.links = {
                related: relationship.links.related(data),
              };
            }

            serialisedData.relationships[relationship.name ?? key] = resourceLinkage;
          } catch (e) {
            console.error(e);
            // Handle the error if needed
          }
        } else if (data[key]) {
          const { minimalData, relationshipLink, additionalIncludeds } = await this.serialiseRelationship(
            data[key],
            await relationship.data.create(),
            paginator,
            relationship,
          );

          resourceLinkage = relationship.forceSingle === true ? { data: minimalData[0] } : { data: minimalData };

          if (relationshipLink) {
            resourceLinkage.links = relationshipLink;
          } else if (relationship.links) {
            resourceLinkage.links = {
              related: relationship.links.related(data),
            };
          }

          if (!relationship.excluded && additionalIncludeds.length > 0) includedElements.push(...additionalIncludeds);

          serialisedData.relationships[relationship.name ?? key] = resourceLinkage;
        } else if (
          manyToManyRelationships.length > 1 &&
          data[manyToManyRelationships[0]] !== undefined &&
          data[manyToManyRelationships[0]].length > 0
        ) {
          serialisedData.relationships[relationship.name ?? key] = { data: [] };
          for (const item of data[manyToManyRelationships[0]]) {
            const { minimalData, additionalIncludeds } = await this.serialiseRelationship(
              item[manyToManyRelationships[1]],
              await relationship.data.create(),
              paginator,
              relationship,
            );

            if (!relationship.excluded && additionalIncludeds.length > 0) includedElements.push(...additionalIncludeds);

            if (relationship.forceSingle === true) {
              serialisedData.relationships[relationship.name ?? key] = {
                data: minimalData,
              };
            } else {
              serialisedData.relationships[relationship.name ?? key].data.push(minimalData);
            }
          }
        } else if (relationship.links) {
          const related = relationship.links.related(data);

          if (related) {
            resourceLinkage.links = {
              related: related,
            };
            serialisedData.relationships[relationship.name ?? key] = resourceLinkage;
          }
        }
      }

      if (Object.keys(serialisedData.relationships).length === 0) delete serialisedData.relationships;
    }

    return {
      serialisedData: serialisedData,
      includedElements: includedElements,
    };
  }

  private async serialiseRelationship<T, R extends JsonApiDataInterface>(
    data: T | T[],
    builder: R,
    paginator?: JsonApiPaginator,
    relationship?: any,
  ): Promise<{
    minimalData: any | any[];
    relationshipLink: any;
    additionalIncludeds: any[];
  }> {
    const response = {
      minimalData: undefined,
      relationshipLink: undefined,
      additionalIncludeds: [],
    };

    if (Array.isArray(data)) {
      // Check if this relationship has a dynamic factory
      if (relationship?.dynamicFactory) {
        const serialisedResults = await Promise.all(
          data.map(async (item: T) => {
            const dynamicSerializer = relationship.dynamicFactory.createDynamicRelationship(item);
            const dynamicBuilder = dynamicSerializer ? await dynamicSerializer.create() : null;
            const actualBuilder = dynamicBuilder || builder;
            return this.serialiseData(item, actualBuilder, paginator);
          }),
        );

        const serialisedData = serialisedResults.map((result) => result.serialisedData);
        const includedElements = serialisedResults.map((result) => result.includedElements).flat();

        response.minimalData = serialisedData.map((result) => {
          return { type: result.type, id: result.id };
        });

        this._addToIncluded(response.additionalIncludeds, includedElements.concat(serialisedData));
      } else {
        // Use Promise.all to handle async operations within map (original logic)
        const serialisedResults = await Promise.all(
          data.map((item: T) => this.serialiseData(item, builder, paginator)),
        );

        const serialisedData = serialisedResults.map((result) => result.serialisedData);

        const includedElements = serialisedResults.map((result) => result.includedElements).flat();

        response.minimalData = serialisedData.map((result) => {
          return { type: result.type, id: result.id };
        });

        this._addToIncluded(response.additionalIncludeds, includedElements.concat(serialisedData));
      }
    } else {
      const { serialisedData, includedElements } = await this.serialiseData(data, builder, paginator);

      response.minimalData = {
        type: serialisedData.type,
        id: serialisedData.id,
      };

      if (serialisedData.links) {
        response.relationshipLink = {
          self: serialisedData.links.self,
        };
      }

      this._addToIncluded(response.additionalIncludeds, [...includedElements, serialisedData]);
    }

    return response;
  }
}
