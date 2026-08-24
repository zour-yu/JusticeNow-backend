import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum ComplaintReviewDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ReviewComplaintDto {
  @IsEnum(ComplaintReviewDecision)
  @IsNotEmpty()
  decision!: ComplaintReviewDecision;

  @IsString()
  @IsOptional()
  note?: string;
}