import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { Auth, getAuth, DecodedIdToken } from 'firebase-admin/auth';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private firebaseApp: App;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

    if (getApps().length === 0) {
      if (projectId && clientEmail && privateKey) {
        this.firebaseApp = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        this.logger.log('Firebase Admin SDK initialized with Service Account Credentials.');
      } else {
        this.firebaseApp = initializeApp({
          projectId: projectId || 'justice-now',
        });
        this.logger.warn('Firebase Admin SDK initialized with default fallback configuration.');
      }
    } else {
      this.firebaseApp = getApp();
    }
  }

  getAuth(): Auth {
    return getAuth(this.firebaseApp);
  }

  async verifyIdToken(token: string): Promise<DecodedIdToken> {
    return this.getAuth().verifyIdToken(token);
  }
}
