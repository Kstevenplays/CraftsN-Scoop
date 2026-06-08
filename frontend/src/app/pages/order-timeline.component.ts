import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-order-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ol class="timeline" [class.is-cancelled]="status === 'cancelled'">
      <li
        *ngFor="let step of steps"
        [class.complete]="isComplete(step.value)"
        [class.current]="step.value === status"
      >
        <span class="dot"></span>
        <div class="text">
          <strong>{{ step.label }}</strong>
        </div>
      </li>
    </ol>
    <p class="cancelled" *ngIf="status === 'cancelled'">Order cancelled</p>
  `,
  styles: [
    `.timeline{list-style:none;margin:.6rem 0 .2rem;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.5rem}`,
    `.timeline li{position:relative;padding-top:1rem;text-align:center;color:var(--cns-brown-soft)}`,
    `.timeline li:not(:last-child)::after{content:'';position:absolute;left:50%;top:.3rem;width:100%;height:2px;background:rgba(59,31,14,.16);z-index:0}`,
    `.dot{position:absolute;left:50%;top:0;transform:translateX(-50%);width:.7rem;height:.7rem;border-radius:999px;background:var(--cns-cream-strong);border:2px solid #fff;z-index:1}`,
    `.timeline li.complete{color:var(--cns-brown)}`,
    `.timeline li.complete .dot{background:var(--cns-coral)}`,
    `.timeline li.current{color:var(--cns-coral)}`,
    `.timeline li.current .dot{background:var(--cns-coral);box-shadow:0 0 0 4px rgba(232,99,58,.16)}`,
    `.timeline.is-cancelled li{color:rgba(122,74,46,.7)}`,
    `.timeline.is-cancelled .dot{background:rgba(59,31,14,.16)}`,
    `.cancelled{margin:.25rem 0 0;color:#b91c1c;font-weight:700}`,
    `@media (max-width: 820px){.timeline{grid-template-columns:1fr}.timeline li{text-align:left;padding:.2rem 0 .2rem 1rem}.timeline li:not(:last-child)::after{display:none}.dot{left:0;transform:none;top:.45rem}}`
  ]
})
export class OrderTimelineComponent {
  @Input() status: string = 'pending';

  readonly steps = [
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'completed', label: 'Completed' },
  ];

  isComplete(value: string): boolean {
    if (this.status === 'cancelled') {
      return false;
    }

    const currentIndex = this.steps.findIndex((s) => s.value === this.status);
    const stepIndex = this.steps.findIndex((s) => s.value === value);

    if (currentIndex < 0 || stepIndex < 0) {
      return false;
    }

    return stepIndex < currentIndex;
  }
}
