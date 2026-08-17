import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/schemas/user.schema';
import { ComplaintStatus } from './schemas/complaint.schema';

@Controller('complaints')
@UseGuards(FirebaseAuthGuard)
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async submitComplaint(
    @CurrentUser() user: User,
    @Body() dto: CreateComplaintDto,
  ) {
    const complaint = await this.complaintsService.create(user, dto);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'Complaint submitted successfully',
      data: complaint,
    };
  }

  @Get('my')
  async getMyComplaints(@CurrentUser() user: User) {
    const complaints = await this.complaintsService.findMyComplaints(user);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Complaints retrieved successfully',
      data: complaints,
    };
  }

  @Get('metrics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INVESTIGATOR)
  async getMetrics() {
    const metrics = await this.complaintsService.getMetrics();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Complaint metrics retrieved successfully',
      data: metrics,
    };
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INVESTIGATOR)
  async getAllComplaints(@Query('status') status?: ComplaintStatus) {
    const complaints = await this.complaintsService.findAll(status);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'All complaints retrieved successfully',
      data: complaints,
    };
  }

  @Get(':id')
  async getComplaintById(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const complaint = await this.complaintsService.findById(id, user);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Complaint details retrieved successfully',
      data: complaint,
    };
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INVESTIGATOR)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateComplaintStatusDto,
    @CurrentUser() user: User,
  ) {
    const updatedComplaint = await this.complaintsService.updateStatus(
      id,
      dto,
      user,
    );
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Complaint status updated successfully',
      data: updatedComplaint,
    };
  }
}
