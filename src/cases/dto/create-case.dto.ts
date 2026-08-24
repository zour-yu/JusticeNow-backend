import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsArray,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ComplaintCategory } from '../../complaints/schemas/complaint.schema';
import { CasePriority } from '../schemas/case.schema';
import { LocationDto, EvidenceItemDto } from '../../complaints/dto/create-complaint.dto';

export class ComplaintSnapshotDto {
  @IsString()
  @IsNotEmpty()
  trackingNumber: string;

  @IsString()
  @IsOptional()
  citizenName?: string;

  @IsString()
  @IsOptional()
  citizenEmail?: string;

  @IsString()
  @IsOptional()
  citizenPhone?: string;

  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @IsDateString()
  @IsNotEmpty()
  incidentDate: string;

  @ValidateNested()
  @Type(() => LocationDto)
  incidentLocation: LocationDto;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  witnessInfo?: string;
}

export class CreateCaseDto {
  @IsString()
  @IsNotEmpty()
  complaintId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(ComplaintCategory)
  category: ComplaintCategory;

  @IsEnum(CasePriority)
  @IsOptional()
  priority?: CasePriority;

  @IsString()
  @IsNotEmpty()
  assignedInvestigatorId: string;

  @IsString()
  @IsNotEmpty()
  assignedInvestigatorName: string;

  @IsString()
  @IsOptional()
  assignedInvestigatorEmail?: string;

  @ValidateNested()
  @Type(() => ComplaintSnapshotDto)
  complaintDetails: ComplaintSnapshotDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenceItemDto)
  @IsOptional()
  evidence?: EvidenceItemDto[];

  @IsString()
  @IsOptional()
  initialNote?: string;
}
