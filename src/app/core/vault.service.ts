import { Injectable, NgZone } from '@angular/core';
import { Session } from '../models/session';
import {
  BrowserVault,
  DeviceSecurityType,
  IdentityVaultConfig,
  Vault,
  VaultType,
} from '@ionic-enterprise/identity-vault';
import { VaultFactoryService } from './vault-factory.service';
import { BehaviorSubject } from 'rxjs';

export type UnlockMode = 'Device' | 'SessionPIN' | 'NeverLock' | 'ForceLogin';

@Injectable({
  providedIn: 'root',
})
export class VaultService {
  vault: BrowserVault | Vault;

  private canUnlockSubject: BehaviorSubject<boolean>;
  get canUnlock$() {
    return this.canUnlockSubject.asObservable();
  }

  constructor(vaultFactory: VaultFactoryService, private zone: NgZone) {
    const config: IdentityVaultConfig = {
      key: 'io.ionic.simpleiv',
      type: VaultType.SecureStorage,
      lockAfterBackgrounded: 1000,
      shouldClearVaultAfterTooManyFailedAttempts: true,
      customPasscodeInvalidUnlockAttempts: 2,
      unlockVaultOnLoad: false,
    };

    this.canUnlockSubject = new BehaviorSubject(false);

    this.vault = vaultFactory.create(config);

    this.vault.onLock(() => {
      this.zone.run(() => {
        this.canUnlockSubject.next(true);
      });
    });

    this.vault.onUnlock(() =>this.zone.run(() =>  this.canUnlockSubject.next(false)));

    this.canUnlock().then((x) => this.canUnlockSubject.next(x));
  }

  private async canUnlock(): Promise<boolean> {
    if ((await this.vault.doesVaultExist()) && (await this.vault.isLocked())) {
      return true;
    }
    return false;
  }

  setUnlockMode(unlockMode: UnlockMode): Promise<void> {
    let type: VaultType;
    let deviceSecurityType: DeviceSecurityType;

    switch (unlockMode) {
      case 'Device':
        type = VaultType.DeviceSecurity;
        deviceSecurityType = DeviceSecurityType.Both;
        break;

      case 'SessionPIN':
        type = VaultType.CustomPasscode;
        deviceSecurityType = DeviceSecurityType.SystemPasscode;
        break;

      case 'ForceLogin':
        type = VaultType.InMemory;
        deviceSecurityType = DeviceSecurityType.SystemPasscode;
        break;

      case 'NeverLock':
        type = VaultType.SecureStorage;
        deviceSecurityType = DeviceSecurityType.SystemPasscode;
        break;

      default:
        type = VaultType.SecureStorage;
        deviceSecurityType = DeviceSecurityType.SystemPasscode;
    }

    return this.vault.updateConfig({
      ...this.vault.config,
      type,
      deviceSecurityType,
    });
  }
}
