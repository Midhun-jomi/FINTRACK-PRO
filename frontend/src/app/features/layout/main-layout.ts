import { Component, OnInit, OnDestroy, inject, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay, filter } from 'rxjs/operators';

// Material Imports
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';

// Services & Models
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ApiService } from '../../core/services/api.service';
import { ChatbotService } from '../../core/services/chatbot.service';
import { Notification } from '../../core/models/models';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    FormsModule
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);
  
  protected readonly authService = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
  protected readonly chatbotService = inject(ChatbotService);

  // Expose signals for HTML bindings
  protected readonly currentUser = this.authService.currentUser;
  protected readonly isAdmin = this.authService.isAdmin;
  protected readonly isDark = this.themeService.isDark;

  // Chat window state signals
  isChatOpen = signal<boolean>(false);
  showCompanionSettings = signal<boolean>(false);
  chatInput = signal<string>('');

  // Expose chatbot signals to template
  activeCompanion = this.chatbotService.activeCompanion;
  companions = this.chatbotService.companions;
  chatMessages = this.chatbotService.messages;

  // Wandering companion pet states
  petX = signal<number | null>(null);
  petY = signal<number | null>(null);
  isWandering = signal<boolean>(false);
  private wanderInterval: any;

  // Active page title signal
  activePageTitle = signal<string>('Dashboard');

  // Notifications signals
  notifications = signal<Notification[]>([]);
  unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);

  // Responsive handset break observer
  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  ngOnInit(): void {
    this.updateTitle(this.router.url);
    
    // Subscribe to router changes to update titles
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateTitle(event.urlAfterRedirects || event.url);
    });

    // Initial load of notifications
    if (this.authService.isAuthenticated()) {
      this.loadNotifications();
      // Poll notifications every 30 seconds
      setInterval(() => this.loadNotifications(), 30000);
    }

    this.startWandering();
  }

  ngOnDestroy(): void {
    this.stopWandering();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.authService.logout();
  }

  private updateTitle(url: string): void {
    if (url.startsWith('/dashboard')) {
      this.activePageTitle.set('Dashboard Hub');
    } else if (url.startsWith('/income')) {
      this.activePageTitle.set('Income Transactions');
    } else if (url.startsWith('/expenses')) {
      this.activePageTitle.set('Expense Logs');
    } else if (url.startsWith('/budget')) {
      this.activePageTitle.set('Budget Planner');
    } else if (url.startsWith('/savings')) {
      this.activePageTitle.set('Savings Targets');
    } else if (url.startsWith('/reports')) {
      this.activePageTitle.set('Financial Reports & Export');
    } else if (url.startsWith('/profile')) {
      this.activePageTitle.set('Profile Settings');
    } else if (url.startsWith('/admin')) {
      this.activePageTitle.set('Admin Command Console');
    } else {
      this.activePageTitle.set('FinTrack Pro');
    }
  }

  loadNotifications(): void {
    this.apiService.get<Notification[]>('notifications').subscribe({
      next: (data) => this.notifications.set(data),
      error: () => console.warn('Could not fetch notifications')
    });
  }

  markNotificationRead(id: string): void {
    this.apiService.put(`notifications/${id}/read`, {}).subscribe({
      next: () => {
        // Update local notification state
        this.notifications.update(list => 
          list.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
      }
    });
  }

  markAllNotificationsRead(): void {
    this.apiService.put('notifications/read-all', {}).subscribe({
      next: () => {
        this.notifications.update(list => 
          list.map(n => ({ ...n, isRead: true }))
        );
      }
    });
  }

  toggleChat(): void {
    this.isChatOpen.update(v => !v);
    if (this.isChatOpen()) {
      this.stopWandering();
      this.showCompanionSettings.set(false);
      this.scrollToBottom();
    } else {
      this.startWandering();
    }
  }

  startWandering(): void {
    if (this.wanderInterval) clearInterval(this.wanderInterval);
    
    // Move every 12 seconds
    this.wanderInterval = setInterval(() => {
      if (this.isChatOpen()) return;
      
      this.isWandering.set(true);
      
      // Boundaries
      const padding = 100;
      const sidebarWidth = window.innerWidth > 959 ? 260 : 0;
      const topHeaderHeight = 70;
      
      const minX = sidebarWidth + padding;
      const maxX = window.innerWidth - padding;
      const minY = topHeaderHeight + padding;
      const maxY = window.innerHeight - padding;
      
      const newX = Math.random() * (maxX - minX) + minX;
      const newY = Math.random() * (maxY - minY) + minY;
      
      this.petX.set(newX);
      this.petY.set(newY);
      
      setTimeout(() => {
        this.isWandering.set(false);
      }, 3000);
    }, 12000);
  }

  stopWandering(): void {
    if (this.wanderInterval) {
      clearInterval(this.wanderInterval);
    }
    this.petX.set(null);
    this.petY.set(null);
    this.isWandering.set(false);
  }

  toggleCompanionSettings(): void {
    this.showCompanionSettings.update(v => !v);
  }

  selectCompanion(id: 'mia' | 'leo' | 'antigravity'): void {
    this.chatbotService.selectCompanion(id);
    this.showCompanionSettings.set(false);
    this.scrollToBottom();
  }

  sendChatMessage(): void {
    const text = this.chatInput().trim();
    if (!text) return;
    
    this.chatbotService.sendMessage(text);
    this.chatInput.set('');
    this.scrollToBottom();
  }

  triggerQuickReply(query: string): void {
    this.chatbotService.sendMessage(query);
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = document.getElementById('chat-messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}
