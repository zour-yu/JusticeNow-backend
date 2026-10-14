import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, UserStatus } from './schemas/user.schema';
import { FirebaseUser } from '../common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import * as AdminAuth from 'firebase-admin/auth';

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

  @Get()
  @Roles(UserRole.ADMIN)
  async getAllUsers(
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
    @Query('search') search?: string,
  ) {
    const users = await this.usersService.findAllUsers({ role, status, search });
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Users retrieved successfully',
      data: users,
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.findUserById(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'User details retrieved successfully',
      data: user,
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

  @Patch('push-token')
  async updatePushToken(
    @FirebaseUser() firebaseUser: AdminAuth.DecodedIdToken,
    @Body('pushToken') pushToken: string,
  ) {
    const updatedUser = await this.usersService.updateByFirebaseUid(firebaseUser.uid, { pushToken });
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Push token updated successfully',
      data: updatedUser,
    };
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  async deactivateUser(@Param('id') id: string) {
    const deactivatedUser = await this.usersService.deactivateUser(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'User account deactivated successfully',
      data: deactivatedUser,
    };
  }

  @Patch(':id/reactivate')
  @Roles(UserRole.ADMIN)
  async reactivateUser(@Param('id') id: string) {
    const reactivatedUser = await this.usersService.reactivateUser(id);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'User account reactivated successfully',
      data: reactivatedUser,
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

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async updateUser(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserDto,
  ) {
    const updatedUser = await this.usersService.updateUserByAdmin(id, updateDto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'User information updated successfully',
      data: updatedUser,
    };
  }
}

