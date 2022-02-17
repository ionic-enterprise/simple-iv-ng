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

  constructor(public auth: AuthService, public vault: VaultService) {
    this.vault.canUnlock$.subscribe((x) => (this.canUnlock = x));
    Device.setHideScreenOnBackground(true);
    this.init();
  }
  async signIn() {
    await this.auth.login();
    // const hasPasscode = await Device.isSystemPasscodeSet();
    // this.vault.setUnlockMode(hasPasscode ? 'Device' : 'NeverLock');
    this.hasSession = true;
  }

  async signOut() {
    await this.auth.logout();
    this.hasSession = false;
  }

  async logout() {
    await this.auth.logout();
  }

  async unlock() {
    await this.vault.vault.unlock();
    this.hasSession = true;
  }

  private async init() {
    this.hasSession = await this.auth.isAuthenticated();
    const id = await this.auth.getIdToken();
    console.log('init', this.hasSession, id);

  }
}
