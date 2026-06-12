import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { API_BASE } from '../core/api';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-gcash-payment',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="gcash-page">
      <div class="gcash-card">
        <h1>Complete Your Payment</h1>

        <!-- Amount -->
        <div class="amount-section">
          <div class="amount-label">Send exactly</div>
          <div class="amount-value">₱{{ total.toFixed(2) }}</div>
          <div class="amount-sub">Make sure to send the exact amount</div>
        </div>

        <!-- QR Code -->
        <div class="qr-section">
          <div class="qr-frame">
            <img src="assets/images/gcash-qr.png" alt="GCash QR Code" class="qr-img" />
          </div>
        </div>

        <!-- Account Details -->
        <div class="account-details">
          <div class="detail-line">Account Name: AI***N M** V.</div>
          <div class="detail-line">Mobile No.: +63 997 497 ••••</div>
          <div class="detail-line">User ID: ••••••••••••ZNADGW</div>
          <div class="detail-note">Transfer fees may apply.</div>
        </div>

        <!-- Instructions -->
        <div class="instructions">
          <div class="step"><span class="step-num">1</span> Open your GCash app</div>
          <div class="step"><span class="step-num">2</span> Tap Send Money or Scan QR</div>
          <div class="step"><span class="step-num">3</span> Enter the EXACT amount: <strong>₱{{ total.toFixed(2) }}</strong></div>
          <div class="step"><span class="step-num">4</span> Take a screenshot of your confirmation</div>
          <div class="step"><span class="step-num">5</span> Upload your screenshot below</div>
        </div>

        <!-- Upload -->
        <div class="upload-section">
          <div class="upload-label">Upload Payment Receipt</div>
          <div class="file-input-wrapper">
            <input type="file" accept=".jpg,.jpeg,.png" (change)="onFileSelected($event)" id="receiptInput" />
            <label for="receiptInput" class="file-label">
              <span *ngIf="!selectedFile">Choose a file (JPG or PNG)</span>
              <span *ngIf="selectedFile">{{ selectedFile.name }}</span>
            </label>
          </div>
          <div class="preview" *ngIf="previewUrl">
            <img [src]="previewUrl" alt="Receipt preview" class="preview-img" />
          </div>
          <button class="btn-confirm" [disabled]="!selectedFile || uploading" (click)="confirmPayment()">
            {{ uploading ? 'Uploading…' : 'Confirm Payment' }}
          </button>
        </div>

        <!-- Bottom Note -->
        <div class="bottom-note">
          Your order will be processed within 1–2 hours after payment confirmation.
        </div>
        <a routerLink="/checkout" class="back-link">← Back to Checkout</a>
      </div>
    </div>
  `,
  styles: [`
    .gcash-page {
      min-height: 100vh;
      background: #F0F7FF;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    }
    .gcash-card {
      width: 100%;
      max-width: 440px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.08);
      padding: 2rem 1.5rem;
      text-align: center;
    }
    .gcash-card h1 {
      margin: 0 0 1.25rem;
      color: #3B1F0E;
      font-size: 1.25rem;
      letter-spacing: 0;
    }

    /* Amount */
    .amount-section { margin-bottom: 1.25rem; }
    .amount-label { font-size: 0.9rem; color: #7a4a2e; font-weight: 600; margin-bottom: 0.25rem; }
    .amount-value {
      font-size: 2rem;
      font-weight: 900;
      color: #007DFF;
      letter-spacing: -0.02em;
    }
    .amount-sub { font-size: 0.78rem; color: #7a4a2e; margin-top: 0.2rem; }

    /* QR */
    .qr-section { margin-bottom: 1.25rem; display: flex; justify-content: center; }
    .qr-frame {
      width: 240px;
      height: 240px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
    }
    .qr-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    /* Account Details */
    .account-details {
      margin-bottom: 1.25rem;
    }
    .detail-line {
      font-size: 0.85rem;
      color: #3B1F0E;
      font-weight: 600;
      margin-bottom: 0.3rem;
    }
    .detail-note {
      font-size: 0.75rem;
      color: #7a4a2e;
      font-style: italic;
      margin-top: 0.35rem;
    }

    /* Instructions */
    .instructions {
      background: #FFF8F0;
      border-radius: 10px;
      padding: 1rem 1.25rem;
      text-align: left;
      margin-bottom: 1.25rem;
    }
    .step {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.85rem;
      color: #3B1F0E;
      margin-bottom: 0.5rem;
    }
    .step:last-child { margin-bottom: 0; }
    .step-num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #007DFF;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      font-weight: 900;
      flex-shrink: 0;
    }

    /* Upload */
    .upload-section { margin-bottom: 1rem; }
    .upload-label {
      font-weight: 800;
      font-size: 0.85rem;
      color: #3B1F0E;
      margin-bottom: 0.5rem;
      text-align: left;
    }
    .file-input-wrapper { margin-bottom: 0.75rem; }
    .file-input-wrapper input[type="file"] { display: none; }
    .file-label {
      display: block;
      border: 2px dashed rgba(59,31,14,0.2);
      border-radius: 10px;
      padding: 0.85rem 1rem;
      text-align: center;
      color: #7a4a2e;
      font-size: 0.85rem;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .file-label:hover { border-color: #007DFF; }
    .preview { margin-bottom: 0.75rem; }
    .preview-img {
      max-width: 100%;
      max-height: 200px;
      border-radius: 8px;
      border: 1px solid rgba(59,31,14,0.1);
    }
    .btn-confirm {
      width: 100%;
      border: 0;
      background: #007DFF;
      color: #fff;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-weight: 900;
      font-size: 0.95rem;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn-confirm:hover { opacity: 0.85; }
    .btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

    .bottom-note {
      font-size: 0.78rem;
      color: #7a4a2e;
      line-height: 1.45;
      margin-bottom: 0.75rem;
    }
    .back-link {
      color: #7a4a2e;
      font-size: 0.85rem;
      font-weight: 700;
      text-decoration: none;
    }
    .back-link:hover { color: #007DFF; }
  `]
})
export class GcashPaymentPageComponent {
  orderId = 0;
  total = 0;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  uploading = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private toast: ToastService
  ) {
    this.route.queryParams.subscribe(params => {
      this.orderId = parseInt(params['order_id'], 10) || 0;
      this.total = parseFloat(params['total']) || 0;
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.selectedFile = file;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  confirmPayment() {
    if (!this.selectedFile || this.uploading || !this.orderId) return;

    this.uploading = true;
    const formData = new FormData();
    formData.append('receipt', this.selectedFile);

    this.http.post<{ message: string; receipt_url: string }>(
      `${API_BASE}/orders/${this.orderId}/upload-receipt`,
      formData
    ).subscribe({
      next: () => {
        this.toast.show('Payment receipt submitted!', 'success');
        this.uploading = false;
      },
      error: (err) => {
        this.toast.show(err.error?.message || 'Upload failed', 'error');
        this.uploading = false;
      },
    });
  }
}