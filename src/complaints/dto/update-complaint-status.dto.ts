import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ComplaintStatus, ComplaintPriority } from '../schemas/complaint.schema';

export class UpdateComplaintStatusDto {
  @IsEnum(ComplaintStatus)
  @IsNotEmpty()
  status: ComplaintStatus;

  @IsString()
  @IsOptional()
  note?: string;

  @IsEnum(ComplaintPriority)
  @IsOptional()
  priority?: ComplaintPriority;

  @IsString()
  @IsOptional()
  assignedInvestigatorId?: string;

  @IsString()
  @IsOptional()
  caseId?: string;
}
