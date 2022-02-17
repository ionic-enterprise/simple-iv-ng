import { Injectable, NgZone } from '@angular/core';
import { Session } from '../models/session';
import {
  BrowserVault,
  Device,
  DeviceSecurityType,
  IdentityVaultConfig,
  Vault,
  VaultType,
} from '@ionic-enterprise/identity-vault';
import { VaultFactoryService } from './vault-factory.service';
import { BehaviorSubject } from 'rxjs';
import { Platform } from '@ionic/angular';

export type UnlockMode = 'Device' | 'SessionPIN' | 'NeverLock' | 'ForceLogin' | 'BiometricDevice' | 'Browser';

@Injectable({
  providedIn: 'root',
})
export class VaultService {
  vault: BrowserVault | Vault;
  unlockMode: UnlockMode;

  private canUnlockSubject: BehaviorSubject<boolean>;
  get canUnlock$() {
    return this.canUnlockSubject.asObservable();
  }

  constructor(vaultFactory: VaultFactoryService, private zone: NgZone, private platform: Platform) {
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

    this.vault.onUnlock(() =>
      this.zone.run(() => this.canUnlockSubject.next(false))
    );

    this.canUnlock().then((x) => this.canUnlockSubject.next(x));
  }

  async init(): Promise<void> {
    //Determine device's capabilities and complete the vault config
    const isBrowser = this.platform.is('hybrid') === false;
    if(isBrowser) {
      await this.setUnlockMode('Browser');
      return;
    }

    const isBiometricsEnabled = await Device.isBiometricsEnabled();
    console.log('vaultService.init', isBiometricsEnabled);
    if (isBiometricsEnabled) {
      await this.setUnlockMode('BiometricDevice');
      return;
    }

    const isBiometricsSupported = await Device.isBiometricsSupported();
    if (isBiometricsSupported) {
      // Here you may want to prompt the user to enable biometrics for a more secure experience
    }
    console.log('vaultService.init', isBiometricsSupported);
    await this.setUnlockMode('ForceLogin');
  }

  async setUnlockMode(unlockMode: UnlockMode): Promise<void> {
    console.log('vaultService.setUnlockMode', unlockMode);
    let deviceSecurityType: DeviceSecurityType;
    let lockAfterBackgrounded = 1000;
    let type: VaultType;

    switch (unlockMode) {
      case 'Browser':
        deviceSecurityType = DeviceSecurityType.None;
        type = VaultType.SecureStorage;
        break;
      case 'BiometricDevice':
        deviceSecurityType = DeviceSecurityType.Both;
        type = VaultType.DeviceSecurity;
        break;
      case 'Device':
        deviceSecurityType = DeviceSecurityType.Both;
        type = VaultType.DeviceSecurity;
        break;

      case 'ForceLogin':
        deviceSecurityType = DeviceSecurityType.None;
        lockAfterBackgrounded = 20 * 60 * 1000;
        type = VaultType.InMemory;
        break;

      case 'NeverLock':
        deviceSecurityType = DeviceSecurityType.SystemPasscode;
        type = VaultType.SecureStorage;
        break;

      case 'SessionPIN':
        deviceSecurityType = DeviceSecurityType.SystemPasscode;
        type = VaultType.CustomPasscode;
        break;

      default:
        deviceSecurityType = DeviceSecurityType.SystemPasscode;
        type = VaultType.SecureStorage;
    }
    const newConfig = {
      ...this.vault.config,
      type,
      lockAfterBackgrounded,
      deviceSecurityType,
    };
    console.log('newConfig', newConfig, this.vault.config);

    await this.vault.updateConfig(newConfig);
    this.unlockMode = unlockMode;
  }

  private async canUnlock(): Promise<boolean> {
    if (
      (await this.vault.isEmpty()) === false &&
      (await this.vault.isLocked())
    ) {
      return true;
    }
    return false;
  }
}
