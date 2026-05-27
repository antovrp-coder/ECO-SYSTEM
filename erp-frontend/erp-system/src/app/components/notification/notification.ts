import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { I18nService } from '../../services/i18n.service';
import { NotificationService, Notification } from '../../services/notification.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './notification.html',
  styleUrl: './notification.scss'
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  notificationProgress: { [key: string]: number } = {};
  notificationElapsedTime: { [key: string]: string } = {};
  notificationTotalTime: { [key: string]: string } = {};
  private destroy$ = new Subject<void>();
  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private i18nService = inject(I18nService);
  private notificationService = inject(NotificationService);

  ngOnInit() {
    this.notificationService.getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications;
        
        // Initialize progress tracking for new notifications
        notifications.forEach(notification => {
          if (!this.notificationProgress[notification.id]) {
            this.notificationProgress[notification.id] = 0;
            this.notificationElapsedTime[notification.id] = this.formatSeconds(0);
            this.notificationTotalTime[notification.id] = this.formatSeconds(notification.duration);
          }
        });

        // Start progress tracking if we have notifications
        if (notifications.length > 0 && !this.progressInterval) {
          this.startProgressTracking();
        } else if (notifications.length === 0) {
          this.stopProgressTracking();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopProgressTracking();
  }

  private startProgressTracking() {
    this.progressInterval = setInterval(() => {
      this.notifications.forEach(notification => {
        const elapsed = Math.min(Date.now() - notification.startTime, notification.duration);
        const progress = Math.min((elapsed / notification.duration) * 100, 100);
        this.notificationProgress[notification.id] = progress;
        this.notificationElapsedTime[notification.id] = this.formatSeconds(elapsed);
        this.notificationTotalTime[notification.id] = this.formatSeconds(notification.duration);
      });
    }, 50);
  }

  private stopProgressTracking() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  getIconForType(type: 'success' | 'error' | 'warning' | 'info'): string {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'info';
    }
  }

  close(id: string) {
    this.notificationService.remove(id);
  }

  getTimeLabel(): string {
    return this.i18nService.t('timeLabel');
  }

  private formatSeconds(durationMs: number): string {
    return `${(durationMs / 1000).toFixed(1)}s`;
  }
}
