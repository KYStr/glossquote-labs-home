export function quote(overrides = {}) {
  return {
    schema: 'gq.quote', version: 1, currency: 'TWD',
    parties: { from: 'Example Studio', to: 'Example Client' },
    items: [{ description: 'Design service', quantity: '2.5', unitPrice: '19.99' }],
    discount: '0', taxRate: '0', note: '', ...overrides,
  };
}
