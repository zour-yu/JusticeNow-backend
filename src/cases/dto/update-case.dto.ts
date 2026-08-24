import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsUrl,
} from 'class-validator';
import { CaseStatus, CasePriority } from '../schemas/case.schema';

export class UpdateCaseStatusDto {
  @IsEnum(CaseStatus)
  @IsNotEmpty()
  status: CaseStatus;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  findings?: string;
}

export class AddCaseEvidenceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string; // 'image', 'document', 'audio', 'video'

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsNumber()
  @IsOptional()
  size?: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class AddCaseNoteDto {
  @IsString()
  @IsNotEmpty()
  note: string;
}

export class UpdateCaseDetailsDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CasePriority)
  @IsOptional()
  priority?: CasePriority;

  @IsString()
  @IsOptional()
  findings?: string;
}
