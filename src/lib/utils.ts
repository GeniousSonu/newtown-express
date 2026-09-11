export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function getStatusDetails(status: string): {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  step: number;
} {
  switch (status) {
    case 'PLACED':
      return { label: 'Order Placed', emoji: '🧾', color: 'text-amber-600', bgColor: 'bg-amber-100', step: 1 };
    case 'PAYMENT_VERIFYING':
      return { label: 'Verifying Payment', emoji: '💳', color: 'text-blue-600', bgColor: 'bg-blue-100', step: 2 };
    case 'ACCEPTED':
      return { label: 'Order Accepted', emoji: '👍', color: 'text-indigo-600', bgColor: 'bg-indigo-100', step: 3 };
    case 'COOKING':
      return { label: 'Cooking in Kitchen', emoji: '🍳', color: 'text-orange-600', bgColor: 'bg-orange-100', step: 4 };
    case 'READY':
      return { label: 'Ready to Serve', emoji: '🍽️', color: 'text-emerald-600', bgColor: 'bg-emerald-100', step: 5 };
    case 'SERVED':
      return { label: 'Served at Desk', emoji: '🛵', color: 'text-green-600', bgColor: 'bg-green-100', step: 6 };
    case 'COMPLETED':
      return { label: 'Plate Collected', emoji: '✨', color: 'text-purple-600', bgColor: 'bg-purple-100', step: 7 };
    case 'REJECTED':
      return { label: 'Order Declined', emoji: '❌', color: 'text-red-600', bgColor: 'bg-red-100', step: 0 };
    default:
      return { label: status, emoji: '⏳', color: 'text-gray-600', bgColor: 'bg-gray-100', step: 1 };
  }
}
