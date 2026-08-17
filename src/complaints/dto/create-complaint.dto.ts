import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ComplaintCategory } from '../schemas/complaint.schema';

export class LocationDto {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsOptional()
  details?: string;
}

export class EvidenceItemDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsOptional()
  size?: number;
}

export class CreateComplaintDto {
  @IsEnum(ComplaintCategory, {
    message:
      'category must be one of: POLICE_MISCONDUCT, DISCRIMINATION, ARBITRARY_DETENTION, FREEDOM_OF_EXPRESSION, LABOR_RIGHTS, GENDER_BASED_VIOLENCE, CHILD_RIGHTS, OTHER',
  })
  @IsNotEmpty()
  category: ComplaintCategory;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  @IsNotEmpty()
  incidentDate: string;

  @ValidateNested()
  @Type(() => LocationDto)
  @IsNotEmpty()
  incidentLocation: LocationDto;

  @IsString()
  @IsOptional()
  witnessInfo?: string;

  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenceItemDto)
  @IsOptional()
  evidence?: EvidenceItemDto[];
}
