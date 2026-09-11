export const UPI_CONFIG = {
  vpa: '8240018314@okbizaxis',
  payeeName: 'Newtown Express',
};

/**
 * Builds standard UPI deep link intent URI
 * e.g. upi://pay?pa=8240018314@okbizaxis&pn=Newtown%20Express&am=120&cu=INR&tn=NTX-849201
 */
export function buildUpiIntentUrl({
  amount,
  transactionNote,
  vpa = UPI_CONFIG.vpa,
  payeeName = UPI_CONFIG.payeeName,
}: {
  amount: number;
  transactionNote: string;
  vpa?: string;
  payeeName?: string;
}): string {
  const params = new URLSearchParams();
  params.append('pa', vpa);
  params.append('pn', payeeName);
  params.append('am', amount.toFixed(2));
  params.append('cu', 'INR');
  params.append('tn', transactionNote);

  return `upi://pay?${params.toString()}`;
}

/**
 * Generates dynamic fallback QR code URL pointing to the exact same UPI URI
 */
export function buildUpiQrCodeUrl(upiIntentUrl: string, size = 280): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(
    upiIntentUrl
  )}`;
}
