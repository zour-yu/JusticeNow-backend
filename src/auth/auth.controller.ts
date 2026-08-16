import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SyncUserDto } from './dto/sync-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser, FirebaseUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/schemas/user.schema';
import * as AdminAuth from 'firebase-admin/auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FirebaseAuthGuard)
  async syncUser(
    @FirebaseUser() firebaseUser: AdminAuth.DecodedIdToken,
    @Body() dto: SyncUserDto,
  ) {
    const user = await this.authService.syncUser(firebaseUser, dto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'User synced successfully',
      data: user,
    };
  }

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  async getCurrentUser(@CurrentUser() user: User) {
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'User profile retrieved successfully',
      data: user,
    };
  }

  @Put('profile')
  @UseGuards(FirebaseAuthGuard)
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ) {
    const updatedUser = await this.authService.updateProfile(user as any, dto);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Profile updated successfully',
      data: updatedUser,
    };
  }
}
