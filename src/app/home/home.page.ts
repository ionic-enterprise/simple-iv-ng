import { Component } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { VaultService } from '../core/vault.service';

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

  constructor(private auth: AuthService, private vault: VaultService) {
    this.vault.canUnlock$.subscribe((x) => (this.canUnlock = x));
  }

  signIn() {
    this.auth.login(this.email, this.password).subscribe((s) => {
      if (s.user) {
        this.vault.setSession(s, 'Device');
        this.hasSession = true;
      }
    });
  }

  signOut() {
    this.auth.logout().subscribe(() => this.hasSession = false);
  }

  async unlock() {
    await this.vault.restoreSession();
    this.hasSession = true;
  }
}
