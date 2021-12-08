import { Injectable, NgZone } from '@angular/core';
import {
  BrowserVault,
  DeviceSecurityType,
  IdentityVaultConfig,
  Vault,
  VaultType,
} from '@ionic-enterprise/identity-vault';
import { BehaviorSubject } from 'rxjs';
import { VaultFactoryService } from './vault-factory.service';

export type UnlockMode = 'Device' | 'SessionPIN' | 'NeverLock' | 'ForceLogin';

@Injectable({
  providedIn: 'root',
})
export class VaultService {
  vault: BrowserVault | Vault;

  private canUnlockSubject: BehaviorSubject<boolean>;

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

    this.vault.onUnlock(() => this.zone.run(() => this.canUnlockSubject.next(false)));

    this.canUnlock().then((x) => this.canUnlockSubject.next(x));

    this.vault.onError((err) => {
      console.log('onError', err);
      this.vault.clear();
    });
  }

  get canUnlock$() {
    return this.canUnlockSubject.asObservable();
  }

  async setUnlockMode(unlockMode: UnlockMode): Promise<void> {
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

    await this.vault.updateConfig({
      ...this.vault.config,
      type,
      deviceSecurityType,
    });
  }

  private async canUnlock(): Promise<boolean> {
    if (!(await this.vault.isEmpty()) && (await this.vault.isLocked())) {
      return true;
    }
    return false;
  }
}
