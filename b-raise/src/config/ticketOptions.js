// Shared helper to derive ticket options (General, VIP, VVIP or Free RSVP)
// from the event's displayed price string.

export const buildTicketOptions = (event) => {
  if (!event) return [];

  const raw = typeof event.price === 'string' ? event.price : '';
  const numeric = parseFloat(raw.replace(/[^0-9.]/g, ''));
  const basePrice = Number.isFinite(numeric) ? numeric : 0;

  // Free events
  if (raw.toLowerCase().includes('free') || basePrice === 0) {
    return [
      {
        id: 'rsvp',
        name: 'Free RSVP',
        description: 'Reserve your spot for this free experience.',
        price: 0,
      },
    ];
  }

  // Paid events: simple tiered structure around the base price
  const generalPrice = basePrice;
  const vipPrice = Math.round((basePrice + 10) * 100) / 100;
  const vvipPrice = Math.round((basePrice + 20) * 100) / 100;

  return [
    {
      id: 'general',
      name: 'General Admission',
      description: 'Standard access to the event.',
      price: generalPrice,
    },
    {
      id: 'vip',
      name: 'VIP',
      description: 'Priority entry with better viewing area.',
      price: vipPrice,
    },
    {
      id: 'vvip',
      name: 'VVIP',
      description: 'Exclusive access and premium experience.',
      price: vvipPrice,
    },
  ];
};
