import { EquipmentStatus } from "@asset2go/shared";
import { Type } from "class-transformer";
import {
  Equals,
  IsDateString,
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { EquipmentModel } from "src/features/equipment/entities/equipment.model";
import { SupplierDataDTO } from "src/features/supplier/dtos/supplier.dto";

export class EquipmentPutAttributesDTO {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate: string;

  @IsDefined()
  @IsNotEmpty()
  @IsString()
  status: EquipmentStatus;
}

export class EquipmentPutRelationshipsDTO {
  @ValidateNested()
  @IsDefined()
  @Type(() => SupplierDataDTO)
  supplier: SupplierDataDTO;
}

export class EquipmentPutDataDTO {
  @Equals(EquipmentModel.endpoint)
  type: string;

  @IsUUID()
  id: string;

  @ValidateNested()
  @IsNotEmpty()
  @Type(() => EquipmentPutAttributesDTO)
  attributes: EquipmentPutAttributesDTO;

  @ValidateNested({ each: true })
  @IsNotEmpty()
  @Type(() => EquipmentPutRelationshipsDTO)
  relationships: EquipmentPutRelationshipsDTO;
}

export class EquipmentPutDTO {
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => EquipmentPutDataDTO)
  data: EquipmentPutDataDTO;
}
