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
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';
import {
  UpdateCaseStatusDto,
  AddCaseEvidenceDto,
  AddCaseNoteDto,
  UpdateCaseDetailsDto,
} from './dto/update-case.dto';
import { AssignInvestigatorDto } from './dto/assign-investigator.dto';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/schemas/user.schema';
import { CaseStatus } from './schemas/case.schema';

@Controller('cases')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get('investigators')
  @Roles(UserRole.ADMIN)
  async getAvailableInvestigators() {
    const investigators = await this.casesService.getAvailableInvestigators();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Available investigators retrieved successfully',
      data: investigators,
    };
  }

  @Patch(':id/assign')
  @Roles(UserRole.ADMIN)
  async assignInvestigator(
    @Param('id') id: string,
    @Body() dto: AssignInvestigatorDto,
    @CurrentUser() user: User,
  ) {
    const updatedCase = await this.casesService.assignInvestigator(id, dto, user);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Investigator assigned to case successfully',
      data: updatedCase,
    };
  }

  @Post('from-complaint/:complaintId/assign')
  @Roles(UserRole.ADMIN)
  async assignInvestigatorToComplaint(
    @Param('complaintId') complaintId: string,
    @Body() dto: AssignInvestigatorDto,
    @CurrentUser() user: User,
  ) {
    const newCase = await this.casesService.assignInvestigatorToComplaint(
      complaintId,
      dto,
      user,
    );
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'Complaint converted to case and investigator assigned successfully',
      data: newCase,
    };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createCase(
    @CurrentUser() user: User,
    @Body() dto: CreateCaseDto,
  ) {
    const newCase = await this.casesService.create(dto, user);
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: 'Case created and assigned successfully',
      data: newCase,
    };
  }

  @Get('assigned')
  @Roles(UserRole.INVESTIGATOR, UserRole.ADMIN)
  async getAssignedCases(
    @CurrentUser() user: User,
    @Query('status') status?: CaseStatus,
  ) {
    const cases = await this.casesService.findAssignedCases(user, status);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Assigned cases retrieved successfully',
      data: cases,
    };
  }

  @Get('metrics')
  @Roles(UserRole.INVESTIGATOR, UserRole.ADMIN)
  async getMetrics(@CurrentUser() user: User) {
    const metrics = await this.casesService.getMetrics(user);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Case metrics retrieved successfully',
      data: metrics,
    };
  }

  @Get('all')
  @Roles(UserRole.ADMIN)
  async getAllCases(
    @CurrentUser() user: User,
    @Query('status') status?: CaseStatus,
  ) {
    const cases = await this.casesService.findAll(user, status);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'All cases retrieved successfully',
      data: cases,
    };
  }

  @Get(':id')
  @Roles(UserRole.INVESTIGATOR, UserRole.ADMIN)
  async getCaseById(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const caseDoc = await this.casesService.findById(id, user);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Case details retrieved successfully',
      data: caseDoc,
    };
  }

  @Patch(':id/status')
  @Roles(UserRole.INVESTIGATOR, UserRole.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCaseStatusDto,
    @CurrentUser() user: User,
  ) {
    const updatedCase = await this.casesService.updateStatus(id, dto, user);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Case status updated successfully',
      data: updatedCase,
    };
  }

  @Post(':id/evidence')
  @Roles(UserRole.INVESTIGATOR, UserRole.ADMIN)
  async addEvidence(
    @Param('id') id: string,
    @Body() dto: AddCaseEvidenceDto,
    @CurrentUser() user: User,
  ) {
    const updatedCase = await this.casesService.addEvidence(id, dto, user);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Evidence attached to case successfully',
      data: updatedCase,
    };
  }

  @Post(':id/notes')
  @Roles(UserRole.INVESTIGATOR, UserRole.ADMIN)
  async addNote(
    @Param('id') id: string,
    @Body() dto: AddCaseNoteDto,
    @CurrentUser() user: User,
  ) {
    const updatedCase = await this.casesService.addNote(id, dto, user);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Investigation note added successfully',
      data: updatedCase,
    };
  }

  @Patch(':id/details')
  @Roles(UserRole.INVESTIGATOR, UserRole.ADMIN)
  async updateDetails(
    @Param('id') id: string,
    @Body() dto: UpdateCaseDetailsDto,
    @CurrentUser() user: User,
  ) {
    const updatedCase = await this.casesService.updateDetails(id, dto, user);
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'Case details updated successfully',
      data: updatedCase,
    };
  }
}
