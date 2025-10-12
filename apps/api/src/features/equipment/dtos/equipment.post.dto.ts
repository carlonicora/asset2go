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

export class EquipmentPostAttributesDTO {
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

export class EquipmentPostRelationshipsDTO {
  @ValidateNested()
  @IsDefined()
  @Type(() => SupplierDataDTO)
  supplier: SupplierDataDTO;
}

export class EquipmentPostDataDTO {
  @Equals(EquipmentModel.endpoint)
  type: string;

  @IsUUID()
  id: string;

  @ValidateNested({ each: true })
  @IsNotEmpty()
  @Type(() => EquipmentPostAttributesDTO)
  attributes: EquipmentPostAttributesDTO;

  @ValidateNested({ each: true })
  @IsNotEmpty()
  @Type(() => EquipmentPostRelationshipsDTO)
  relationships: EquipmentPostRelationshipsDTO;
}

export class EquipmentPostDTO {
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => EquipmentPostDataDTO)
  data: EquipmentPostDataDTO;
}
