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

  signIn() {
    this.auth.login(this.email, this.password).subscribe(async (s) => {
      if (s.user) {
        const hasPasscode = await Device.isSystemPasscodeSet();
        await this.vault.clearSession();
        await this.vault.setSession(s, hasPasscode ? 'Device' : 'NeverLock');
        this.hasSession = true;
      }
    });
  }

  signOut() {
    this.auth.logout().subscribe(async () => {
      this.vault.clearSession();
      this.hasSession = false;
    });
  }

  async unlock() {
    try {
      await this.vault.restoreSession();
      this.hasSession = true;
    } catch (err) {
      alert('going to clear the session');
      this.vault.clearSession();
    }
  }
}
