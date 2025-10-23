/**
 * This migration creates the initial permissions for modules and features.
 * A module can belong to a feature, and a role can have permissions on a module or a feature.
 */

import { Action } from "src/common/enums/action";
import { MigrationInterface } from "src/core/migrator/interfaces/migration.interface";
import { permissionQuery } from "src/neo4j.migrations/queries/migration.queries";

export const migration: MigrationInterface[] = [
  ...[
    "f9e77c8f-bfd1-4fd4-80b0-e1d891ab7113",
    "04cfc677-0fd2-4f5e-adf4-2483a00c0277",
    "9f6416e6-7b9b-4e1a-a99f-833191eca8a9",
  ].map((moduleId) => ({
    query: permissionQuery,
    queryParams: {
      roleId: "2e1eee00-6cba-4506-9059-ccd24e4ea5b0",
      moduleId,
      permissions: JSON.stringify([
        { type: Action.Create, value: true },
        { type: Action.Read, value: true },
        { type: Action.Update, value: true },
        { type: Action.Delete, value: true },
      ]),
    },
  })),
];
