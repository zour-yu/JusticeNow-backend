import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, UserStatus } from './schemas/user.schema';

@Controller('users')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('investigators/pending')
  @Roles(UserRole.ADMIN)
  async getPendingInvestigators() {
    const investigators = await this.usersService.findPendingInvestigators();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Pending investigator registrations retrieved successfully',
      data: investigators,
    };
  }

  @Get('investigators/all')
  @Roles(UserRole.ADMIN)
  async getAllInvestigators() {
    const investigators = await this.usersService.findAllInvestigators();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'All investigators retrieved successfully',
      data: investigators,
    };
  }

  @Patch('investigators/:id/approve')
  @Roles(UserRole.ADMIN)
  async approveInvestigator(@Param('id') id: string) {
    const approvedUser = await this.usersService.approveInvestigator(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Investigator registration approved successfully (status: ACTIVE)',
      data: approvedUser,
    };
  }

  @Patch('investigators/:id/reject')
  @Roles(UserRole.ADMIN)
  async rejectInvestigator(@Param('id') id: string) {
    const rejectedUser = await this.usersService.rejectInvestigator(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Investigator registration rejected successfully (status: INACTIVE)',
      data: rejectedUser,
    };
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: UserStatus,
  ) {
    const updatedUser = await this.usersService.updateUserStatus(id, status);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: `User status updated to ${status} successfully`,
      data: updatedUser,
    };
  }
}
