import { formatPhone, isValidEmail, normalizePhone } from './customer.ts';

describe('isValidEmail', () => {
  it.each(['a@b.co', 'first.last+tag@sub.example.in', '  name@example.com  '])(
    'accepts %j',
    (email) => expect(isValidEmail(email)).toBe(true),
  );

  it.each([
    'a@b',
    'a b@c.com',
    '@b.com',
    'a@.com',
    'a@@b.com',
    'a@b.',
    'plainaddress',
    `${'a'.repeat(250)}@b.co`,
  ])('rejects %j', (email) => expect(isValidEmail(email)).toBe(false));
});

describe('normalizePhone', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
    ['+919876543210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['098765-43210', '+919876543210'],
    ['(98765) 43210', '+919876543210'],
    ['6000000000', '+916000000000'],
    // Starts with 91 but is itself a valid 10-digit mobile — must not be read as a prefix.
    ['9198765432', '+919198765432'],
  ])('normalises %j to %s', (raw, normalized) => {
    expect(normalizePhone(raw)).toBe(normalized);
  });

  it.each(['5876543210', '987654321', '98765432100', '+1 9876543210', '98765abcde', ''])(
    'rejects %j',
    (raw) => expect(normalizePhone(raw)).toBeNull(),
  );
});

describe('formatPhone', () => {
  it('groups digits for display', () => {
    expect(formatPhone('+919876543210')).toBe('+91 98765 43210');
  });
});
