import { Component } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { VaultService } from '../core/vault.service';
import { Device } from '@ionic-enterprise/identity-vault';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  email: string;
  password: string;
  canUnlock = false;
  hasSession = false;
  hideScreen = false;

  constructor(private auth: AuthService, private vault: VaultService) {
    this.vault.canUnlock$.subscribe((x) => (this.canUnlock = x));
    Device.isHideScreenOnBackgroundEnabled().then((x) => (this.hideScreen = x));
  }

  async signIn() {
    await this.auth.login();
    const hasPasscode = await Device.isSystemPasscodeSet();
    this.vault.setUnlockMode(hasPasscode ? 'Device' : 'NeverLock');
    this.hasSession = true;
  }

  async signOut() {
    await this.auth.logout();
    this.hasSession = false;
  }

  async unlock() {
    await this.vault.vault.unlock();
    this.hasSession = true;
  }
}
