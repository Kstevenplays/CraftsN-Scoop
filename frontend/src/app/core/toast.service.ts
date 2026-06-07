import { Injectable, signal } from '@angular/core';

export type ToastLevel = 'info' | 'success' | 'error';

export interface ToastMessage {
  id: number;
  text: string;
  level: ToastLevel;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private _messages = signal<ToastMessage[]>([]);

  readonly messages = this._messages.asReadonly();

  show(text: string, level: ToastLevel = 'info', duration = 3500) {
    const msg: ToastMessage = { id: this.nextId++, text, level };
    this._messages.set([...this._messages(), msg]);
    if (duration > 0) {
      setTimeout(() => this.dismiss(msg.id), duration);
    }
    return msg.id;
  }

  dismiss(id: number) {
    this._messages.set(this._messages().filter((m) => m.id !== id));
  }

  clear() {
    this._messages.set([]);
  }
}
