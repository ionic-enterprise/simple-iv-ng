import { Injectable } from '@angular/core';
import { IonicAuth } from '@ionic-enterprise/auth';
import { Platform } from '@ionic/angular';
import { mobileAuthConfig, webAuthConfig } from 'src/environments/environment';
import { VaultService } from '../core/vault.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService extends IonicAuth {
  // @ts-ignore
  constructor(vaultService: VaultService, platform: Platform) {
    const isCordovaApp = platform.is('hybrid');
    const config = isCordovaApp ? mobileAuthConfig : webAuthConfig;
    config.tokenStorageProvider = vaultService.vault;
    super(config);
  }
}
