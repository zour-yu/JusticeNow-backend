import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { FirebaseService } from '../../config/firebase.service';
import { UsersService } from '../../users/users.service';
import { UserStatus } from '../../users/schemas/user.schema';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decodedToken = await this.firebaseService.verifyIdToken(token);
      request.firebaseUser = decodedToken;

      // Find user in MongoDB by Firebase UID
      const user = await this.usersService.findByFirebaseUid(decodedToken.uid);

      const path = request.url || request.path || '';
      const isSyncRoute = path.includes('/auth/sync');

      if (!user) {
        if (!isSyncRoute) {
          throw new UnauthorizedException('User profile not found. Please complete registration.');
        }
      } else {
        if (user.status === UserStatus.SUSPENDED) {
          throw new ForbiddenException('Your account has been suspended. Contact support.');
        }
        if (user.status === UserStatus.INACTIVE) {
          throw new ForbiddenException('Your account is inactive.');
        }
      }

      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid authentication token: ' + error.message);
    }
  }
}
