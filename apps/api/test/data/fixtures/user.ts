import { ROLES } from "test/data/fixtures/role";
import { COMPANIES } from "./company";

export const USERS = {
  CompanyOne_CompanyAdministrator: {
    id: "065cd2a5-57b0-457d-a29f-48ffc7c4f607",
    company: COMPANIES.CompanyOne,
    roles: [ROLES.CompanyAdministrator],
    bio: "Company Administrator at Asset2Go",
    email: "companyadministrator@carlonicora.com",
    isActive: true,
    isDeleted: false,
    name: "CompanyAdministrator",
    password: "$2b$10$3our.jMiQtHDRz5jrinv8.Pj44Hs5/PqrCYiAumOqnLCTQPJDcAXO",
  },
  CompanyOne_User: {
    id: "f40f9122-6dc7-4c6e-9c09-ff095a46be7a",
    company: COMPANIES.CompanyOne,
    roles: [],
    bio: "User at Asset2Go",
    email: "user@carlonicora.com",
    isActive: true,
    isDeleted: false,
    name: "User",
    password: "$2b$10$3our.jMiQtHDRz5jrinv8.Pj44Hs5/PqrCYiAumOqnLCTQPJDcAXO",
  },
  CompanyOne_HumanResource: {
    id: "6e126816-b0ee-4da0-bd17-0da21850848f",
    company: COMPANIES.CompanyOne,
    roles: [ROLES.HumanResource],
    bio: "Human Resource User at Asset2Go",
    email: "hr@carlonicora.com",
    isActive: true,
    isDeleted: false,
    name: "Human Resource",
    password: "$2b$10$3our.jMiQtHDRz5jrinv8.Pj44Hs5/PqrCYiAumOqnLCTQPJDcAXO",
  },
  CompanyTwo_CompanyAdministrator: {
    id: "d8879c6b-c2e0-49bb-978a-d370be14c332",
    company: COMPANIES.CompanyTwo,
    roles: [ROLES.CompanyAdministrator],
    bio: "Company Administrator at Another Company",
    email: "companyadministrator@another.com",
    isActive: true,
    isDeleted: false,
    name: "CompanyAdministrator",
    password: "$2b$10$3our.jMiQtHDRz5jrinv8.Pj44Hs5/PqrCYiAumOqnLCTQPJDcAXO",
  },
};
