import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-wrap">
      <div *ngFor="let t of toasts()" class="toast" [attr.data-level]="t.level">
        <div class="text">{{ t.text }}</div>
        <button class="close" (click)="dismiss(t.id)">×</button>
      </div>
    </div>
  `,
  styles: [
    `:host{position:fixed;right:12px;top:12px;z-index:1200;pointer-events:none}`,
    `.toast-wrap{display:flex;flex-direction:column;gap:.6rem;align-items:flex-end}`,
    `.toast{min-width:220px;max-width:360px;background:var(--cns-brown);color:#fff8f0;padding:.65rem .85rem;border-radius:var(--cns-radius);box-shadow:0 12px 30px rgba(59,31,14,.2);display:flex;align-items:center;gap:.6rem;pointer-events:auto}`,
    `.toast[data-level="success"]{background:var(--cns-coral)}`,
    `.toast[data-level="error"]{background:#b91c1c}`,
    `.text{flex:1}`,
    `.close{border:0;background:transparent;color:rgba(255,255,255,.9);font-size:18px;line-height:1;cursor:pointer}`,
  ],
})
export class ToastComponent {
  constructor(private toast: ToastService) {}

  toasts = this.toast.messages;

  dismiss(id: number) {
    this.toast.dismiss(id);
  }
}
