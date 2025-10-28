import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="message" role="status" aria-live="polite" tabindex="-1" style="position:fixed; right:1rem; top:1rem; z-index:1050;">
      <div [ngClass]="['toast', messageClass]">{{ message }}</div>
    </div>
  `
})
export class Toast implements OnChanges, OnDestroy {
  @Input() message: string | null = null;
  @Input() type: 'error' | 'success' = 'error';
  @Input() duration = 4000;
  @Output() closed = new EventEmitter<void>();

  private timer: any;

  get messageClass() {
    return this.type === 'error' ? 'toast-error' : 'toast-success';
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['message']) {
      if (this.timer) { clearTimeout(this.timer); this.timer = undefined; }
      if (this.message) {
        this.timer = setTimeout(() => {
          this.closed.emit();
          this.timer = undefined;
        }, this.duration);
      }
    }
  }

  ngOnDestroy() {
    if (this.timer) clearTimeout(this.timer);
  }
}
