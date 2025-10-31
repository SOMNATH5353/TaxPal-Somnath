import { Component, EventEmitter, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-sign-in-form',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './sign-in-form.component.html',
  styleUrls: ['./sign-in-form.component.css']
})
export class SignInFormComponent implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();
  @Output() switchToSignUp = new EventEmitter<void>();
  
  email: string = '';
  password: string = '';
  rememberMe: boolean = false;
  showPassword: boolean = false;
  isDarkMode: boolean = false;
  loading = false;
  errorMsg = '';
  successMsg = '';

  // controller used to cancel/timeout fetch sign-in request
  private signInAbortController: AbortController | null = null;
  
  floatingEmojis: { symbol: string, style: any }[] = [];
  private emojis = ['💰', '💵', '💸', '💲', '💹', '💳'];
  private maxEmojis = 10;
  private animationInterval: any;
  
  constructor(private router: Router, private http: HttpClient) {
    // Check if dark mode is enabled
    this.isDarkMode = document.documentElement.classList.contains('dark');
  }
  
  ngOnInit() {
    this.startEmojiAnimation();
  }
  
  ngOnDestroy() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }
  }
  
  private startEmojiAnimation() {
    this.animationInterval = setInterval(() => {
      // Only add new emoji if we haven't reached the max
      if (this.floatingEmojis.length < this.maxEmojis) {
        this.addFloatingEmoji();
      }
      
      // Remove completed animations
      this.floatingEmojis = this.floatingEmojis.filter(emoji => 
        Date.now() - emoji.style.createdAt < 8000
      );
    }, 800);
  }

  private addFloatingEmoji() {
    const randomEmoji = this.emojis[Math.floor(Math.random() * this.emojis.length)];
    const left = Math.random() * 100; // Random horizontal position (0-100%)
    const rotationStart = Math.random() * 360; // Random initial rotation
    const scale = 0.8 + Math.random() * 0.4; // Random scale between 0.8 and 1.2
    const duration = 6 + Math.random() * 4; // Random duration between 6-10s
    
    this.floatingEmojis.push({
      symbol: randomEmoji,
      style: {
        left: `${left}%`,
        top: '-20px', // Changed from bottom to top
        transform: `rotate(${rotationStart}deg) scale(${scale})`,
        animationDuration: `${duration}s`,
        createdAt: Date.now()
      }
    });
  }
  
  closeModal(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeForm();
    }
  }
  
  closeForm() {
    this.close.emit();
  }
  
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
  
  async signIn() {
    if (!this.email || !this.password || this.loading) return;
    
    // Clear existing auth data
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_id');
    
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    // Abort previous controller if any
    if (this.signInAbortController) {
      try { this.signInAbortController.abort(); } catch {}
    }
    this.signInAbortController = new AbortController();
    const signal = this.signInAbortController.signal;

    // Short timeout (8s) — will abort the fetch if backend is slow
    const timeoutMs = 8000;
    const timeoutId = setTimeout(() => {
      try { this.signInAbortController?.abort(); } catch {}
    }, timeoutMs);

    const url = `${environment.apiBaseUrl || '/api'}/users/signin`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.email, password: this.password }),
        signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Map common HTTP errors
        if (response.status === 401) {
          this.errorMsg = 'Incorrect password';
        } else if (response.status === 404) {
          this.errorMsg = 'No account found with that email';
        } else {
          const text = await response.text().catch(() => '');
          this.errorMsg = text || `Sign in failed (${response.status})`;
        }
        return;
      }
      
      const res = await response.json().catch(() => null);
      this.successMsg = 'Signed in!';
      
      if (res?.user) {
        localStorage.setItem('user_email', res.user.email);
        localStorage.setItem('user_name', res.user.name || '');
        localStorage.setItem('user_id', res.user._id || '');
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { email: res.user.email, name: res.user.name } }));
      } else if (res?.token) {
        // Some backends return token + user separately
        localStorage.setItem('jwt', res.token);
      }
      
      this.closeForm();
      this.router.navigate(['/user-profile']);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === 'AbortError') {
        this.errorMsg = 'Sign in request was cancelled or timed out. Please try again.';
      } else {
        console.error('Sign in error:', err);
        this.errorMsg = err?.message || 'Failed to sign in. Please try again.';
      }
    } finally {
      this.loading = false;
      this.signInAbortController = null;
    }
  }
  
  // Allow UI to cancel a pending sign-in (bind to a cancel button if desired)
  cancelSignIn() {
    if (this.signInAbortController) {
      try { this.signInAbortController.abort(); } catch {}
      this.signInAbortController = null;
      this.loading = false;
      this.errorMsg = 'Sign in cancelled';
    }
  }
  
  onSwitchToSignUp(event: Event) {
    event.preventDefault();
    this.switchToSignUp.emit();
  }
}
