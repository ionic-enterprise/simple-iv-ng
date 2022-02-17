import { Injectable } from '@angular/core';
import { AuthResult, IonicAuth } from '@ionic-enterprise/auth';
import { Platform } from '@ionic/angular';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { mobileAuthConfig, webAuthConfig } from 'src/environments/environment';
import { VaultService } from '../core/vault.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService extends IonicAuth {
  user$: Observable<any>;
  private isHybridApp;
  private userSubject: BehaviorSubject<any>;
  constructor(vaultService: VaultService, platform: Platform) {
    const isHybridApp = platform.is('hybrid');
    const config = isHybridApp ? mobileAuthConfig : webAuthConfig;
    config.tokenStorageProvider = vaultService.vault;
    super(config);
    this.isHybridApp = isHybridApp;
    this.userSubject  = new BehaviorSubject(undefined);
    this.user$ = this.userSubject.asObservable().pipe(filter(u => u !== undefined));
  }

  async isAuthenticated(): Promise<boolean> {
      if(this.isHybridApp === false) {
        const isAccessTokenAvailable = await super.isAccessTokenAvailable();
        const isAccessTokenExpired = await super.isAccessTokenExpired();
        if(isAccessTokenAvailable && !isAccessTokenExpired && this.userSubject.getValue() === undefined) {
          await this.updateUser();
        }
        return isAccessTokenAvailable && !isAccessTokenExpired;
      } const isAuthenticated = await super.isAuthenticated();
      if(isAuthenticated && this.userSubject.getValue() === undefined) {
        await this.updateUser();
      }
      return isAuthenticated;
  }

  async onLoginSuccess(result: AuthResult): Promise<void> {
      await this.updateUser();
  }

  private async updateUser() {
    const data = await this.getIdToken();
      this.userSubject.next(data);
  }
}

