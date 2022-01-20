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
  private canUnlockSubject: BehaviorSubject<boolean>;
  private session: Session;
  private sessionKey = 'session';
  private vault: BrowserVault | Vault;

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
        this.session = undefined;
        this.canUnlockSubject.next(true);
      });
    });

    this.vault.onUnlock(() => console.log('The vault has been unlocked'));

    this.canUnlock().then((x) => this.canUnlockSubject.next(x));

    this.vault.onError((err) => {
      console.log('onError', err);
      this.vault.clear();
    });
  }

  get canUnlock$() {
    return this.canUnlockSubject.asObservable();
  }

  async setSession(session: Session, unlockMode: UnlockMode): Promise<void> {
    await this.setUnlockMode(unlockMode);
    this.session = session;
    await this.vault.setValue(this.sessionKey, session);
  }

  async clearSession(): Promise<void> {
    await this.vault.clear();
    this.session = undefined;
    await this.setUnlockMode('NeverLock');
  }

  async restoreSession(): Promise<Session> {
    if (!this.session) {
      this.session = await this.vault.getValue(this.sessionKey);
      this.canUnlockSubject.next(false);
    }
    return this.session;
  }

  private async canUnlock(): Promise<boolean> {
    if (!(await this.vault.isEmpty()) && (await this.vault.isLocked())) {
      return true;
    }
    return false;
  }

  private async setUnlockMode(unlockMode: UnlockMode): Promise<void> {
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
}
