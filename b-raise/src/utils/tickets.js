// Shared helpers for building ticket options from an event

// Builder for ticket options based on the event data
export const buildTicketOptions = (event) => {
  if (!event) return [];

  // 1) If the event is explicitly marked as free, surface a single RSVP option
  if (event.isFree) {
    return [
      {
        id: 'rsvp',
        name: 'Free RSVP',
        description: 'Reserve your spot for this free experience.',
        price: 0,
      },
    ];
  }

  // 2) If host configured ticket tiers in the event document, use those
  const tickets = event.tickets || {};
  const tiers = [
    { key: 'basic', id: 'basic', name: 'Basic' },
    { key: 'vip', id: 'vip', name: 'VIP' },
    { key: 'vvip', id: 'vvip', name: 'VVIP' },
  ];

  const optionsFromTiers = tiers
    .map((tier) => {
      const config = tickets[tier.key] || {};
      const rawPrice = config.price;
      const numeric = rawPrice ? parseFloat(String(rawPrice)) : NaN;

      if (!Number.isFinite(numeric) || numeric < 0) return null;

      return {
        id: tier.id,
        name: tier.name,
        description: 'Tickets configured by the event host.',
        price: numeric,
      };
    })
    .filter(Boolean);

  if (optionsFromTiers.length > 0) {
    return optionsFromTiers;
  }

  // 3) Fallback: derive options from the event's displayed base price
  const raw = typeof event.price === 'string' ? event.price : '';
  const numeric = parseFloat(raw.replace(/[^0-9.]/g, ''));
  const basePrice = Number.isFinite(numeric) ? numeric : 0;

  // Free events based on label or zero price
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
