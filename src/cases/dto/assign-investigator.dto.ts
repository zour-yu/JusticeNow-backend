import { IsString, IsNotEmpty, IsOptional, IsEnum, IsEmail } from 'class-validator';
import { CasePriority } from '../schemas/case.schema';

export class AssignInvestigatorDto {
  @IsString()
  @IsNotEmpty()
  investigatorId: string;

  @IsString()
  @IsNotEmpty()
  investigatorName: string;

  @IsEmail()
  @IsOptional()
  investigatorEmail?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsEnum(CasePriority)
  @IsOptional()
  priority?: CasePriority;
}
