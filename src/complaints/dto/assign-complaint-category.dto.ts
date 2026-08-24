import { IsEnum, IsNotEmpty } from 'class-validator';
import { ComplaintCategory } from '../schemas/complaint.schema';

export class AssignComplaintCategoryDto {
  @IsEnum(ComplaintCategory)
  @IsNotEmpty()
  category: ComplaintCategory;
}