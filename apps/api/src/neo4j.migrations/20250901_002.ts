/**
 * This migration creates the initial set of modules in the database.
 */

import { Action } from "src/common/enums/action";
import { MigrationInterface } from "src/core/migrator/interfaces/migration.interface";
import { moduleQuery } from "src/neo4j.migrations/queries/migration.queries";

export const migration: MigrationInterface[] = [
  {
    query: moduleQuery,
    queryParams: {
      moduleName: "Auth",
      moduleId: "035fe8a6-d467-40c0-9d1d-6a87f0dd286e",
      featureId: null,
      isCore: true,
      permissions: JSON.stringify([
        { type: Action.Create, value: true },
        { type: Action.Read, value: true },
        { type: Action.Update, value: true },
        { type: Action.Delete, value: true },
      ]),
    },
  },
  {
    query: moduleQuery,
    queryParams: {
      moduleName: "Company",
      moduleId: "f9e77c8f-bfd1-4fd4-80b0-e1d891ab7113",
      featureId: null,
      isCore: true,
      permissions: JSON.stringify([{ type: Action.Read, value: true }]),
    },
  },
  {
    query: moduleQuery,
    queryParams: {
      moduleName: "Notification",
      moduleId: "9259d704-c670-4e77-a3a1-a728ffc5be3d",
      featureId: null,
      isCore: true,
      permissions: JSON.stringify([
        { type: Action.Read, value: true },
        { type: Action.Update, value: true },
      ]),
    },
  },
  {
    query: moduleQuery,
    queryParams: {
      moduleName: "Role",
      moduleId: "9f6416e6-7b9b-4e1a-a99f-833191eca8a9",
      featureId: null,
      isCore: true,
      permissions: JSON.stringify([{ type: Action.Read, value: true }]),
    },
  },
  {
    query: moduleQuery,
    queryParams: {
      moduleName: "S3",
      moduleId: "db41ba46-e171-4324-8845-99353eba8568",
      featureId: null,
      isCore: true,
      permissions: JSON.stringify([{ type: Action.Read, value: true }]),
    },
  },
  {
    query: moduleQuery,
    queryParams: {
      moduleName: "User",
      moduleId: "04cfc677-0fd2-4f5e-adf4-2483a00c0277",
      featureId: null,
      isCore: true,
      permissions: JSON.stringify([
        { type: Action.Read, value: true },
        { type: Action.Update, value: "id" },
      ]),
    },
  },
  {
    query: moduleQuery,
    queryParams: {
      moduleName: "Supplier",
      moduleId: "92026e55-4f3a-4782-823a-b44ad5ca1b04",
      featureId: null,
      isCore: true,
      permissions: JSON.stringify([
        { type: Action.Create, value: true },
        { type: Action.Read, value: true },
        { type: Action.Update, value: true },
        { type: Action.Delete, value: true },
      ]),
    },
  },
  {
    query: moduleQuery,
    queryParams: {
      moduleName: "Employee",
      moduleId: "ce64ac33-8d42-4178-97ec-902979cd461a",
      featureId: null,
      isCore: true,
      permissions: JSON.stringify([
        { type: Action.Create, value: true },
        { type: Action.Read, value: true },
        { type: Action.Update, value: true },
        { type: Action.Delete, value: true },
      ]),
    },
  },
  {
    query: moduleQuery,
    queryParams: {
      moduleName: "Equipment",
      moduleId: "8e5d7513-58a0-40c6-83d1-4a3bf7744853",
      featureId: null,
      isCore: true,
      permissions: JSON.stringify([
        { type: Action.Create, value: true },
        { type: Action.Read, value: true },
        { type: Action.Update, value: true },
        { type: Action.Delete, value: true },
      ]),
    },
  },
  {
    query: moduleQuery,
    queryParams: {
      moduleName: "Loan",
      moduleId: "fa40cf09-63ec-4da1-be30-dc4c7a667954",
      featureId: null,
      isCore: true,
      permissions: JSON.stringify([
        { type: Action.Create, value: true },
        { type: Action.Read, value: true },
        { type: Action.Update, value: true },
        { type: Action.Delete, value: true },
      ]),
    },
  },
  {
    query: moduleQuery,
    queryParams: {
      moduleName: "Analytic",
      moduleId: "ee1f7bf6-92a1-4b22-b36f-adcff4b557ca",
      featureId: null,
      isCore: true,
      permissions: JSON.stringify([{ type: Action.Read, value: true }]),
    },
  },
];
