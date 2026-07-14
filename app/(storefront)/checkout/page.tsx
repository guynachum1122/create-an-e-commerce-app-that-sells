'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import { maskCardNumber } from '@/lib/payments/types';
import { tokenizeMockPaymentMethod } from '@/lib/payments/mock-client';
import { ShieldCheck, Lock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';

const STEPS = ['Address', 'Shipping', 'Payment', 'Review'];

type Address = {
  id: string;
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  phone?: string | null;
  isDefault: boolean;
};

type ShippingMethod = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
};

type CartItem = {
  id: string;
  quantity: number;
  unitPrice?: number;
  variant: {
    name: string;
    price: number;
    product: { name: string };
  };
};

export default function CheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [cartLoading, setCartLoading] = useState(true);
  const [outOfStock, setOutOfStock] = useState<{ productName: string; variantName: string; available: number }[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState({
    firstName: '', lastName: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'US', phone: '',
  });
  const [shippingMethodId, setShippingMethodId] = useState('');
  const [payment, setPayment] = useState({ cardNumber: '', expiry: '', cvc: '', nameOnCard: '' });
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoApplied, setPromoApplied] = useState('');
  const [loading, setLoading] = useState(false);
  const [last4, setLast4] = useState('');
  const [paymentToken, setPaymentToken] = useState<{ paymentMethodId: string; last4: string } | null>(null);
  const [taxRateBps, setTaxRateBps] = useState(0);

  useEffect(() => {
    const savedStep = sessionStorage.getItem('checkout_step');
    if (savedStep) {
      const parsed = Number(savedStep);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 3) {
        setStep(parsed);
      }
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('checkout_step', String(step));
  }, [step]);

  useEffect(() => {
    Promise.all([
      fetch('/api/cart').then((r) => r.json()),
      fetch('/api/account/addresses').then((r) => r.json()),
      fetch('/api/shipping-methods').then((r) => r.json()),
    ]).then(([cartData, addrData, shipData]) => {
      setCartItems(cartData.items || []);
      setSubtotal(cartData.subtotal || 0);
      setOutOfStock(cartData.outOfStock || []);
      setAddresses(addrData.addresses || []);
      setShippingMethods(shipData.methods || []);
      setTaxRateBps(shipData.taxRateBps ?? 0);
      const defaultAddr = addrData.addresses?.find((a: Address) => a.isDefault);
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      if (shipData.methods?.[0]) setShippingMethodId(shipData.methods[0].id);
      setCartLoading(false);
    });
  }, []);

  const shippingCost = subtotal >= 7500 ? 0 : (shippingMethods.find((m) => m.id === shippingMethodId)?.price || 0);
  const discountedSubtotal = subtotal - promoDiscount;
  const taxAmount = Math.round((discountedSubtotal * taxRateBps) / 10000);
  const total = discountedSubtotal + shippingCost + taxAmount;
  const checkoutBlocked = outOfStock.length > 0;

  async function applyPromo() {
    const res = await fetch('/api/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: promoCode }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Invalid promo code');
      setPromoDiscount(0);
      setPromoApplied('');
      return;
    }
    setPromoDiscount(data.discountAmount);
    setPromoApplied(data.code);
    toast.success('Promo code applied');
  }

  async function proceedToReview() {
    try {
      const token = await tokenizeMockPaymentMethod(payment);
      setPaymentToken(token);
      setLast4(token.last4);
      setPayment({ cardNumber: '', expiry: '', cvc: '', nameOnCard: '' });
      setStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid card details');
    }
  }

  async function placeOrder() {
    if (checkoutBlocked) {
      toast.error('Remove out-of-stock items before checkout.');
      return;
    }
    if (!paymentToken) {
      toast.error('Please complete the payment step first.');
      return;
    }

    setLoading(true);

    const intentRes = await fetch('/api/payment/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shippingMethodId,
        promoCode: promoApplied || undefined,
      }),
    });
    const intentData = await intentRes.json();
    if (!intentRes.ok) {
      setLoading(false);
      toast.error(intentData.error || 'Payment setup failed');
      return;
    }

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addressId: selectedAddressId,
        newAddress: selectedAddressId ? undefined : newAddress,
        shippingMethodId,
        intentId: intentData.intentId,
        paymentMethodId: paymentToken.paymentMethodId,
        last4: paymentToken.last4,
        promoCode: promoApplied || undefined,
      }),
    });
    setLoading(false);

    if (res.status === 429) {
      toast.error('Too many attempts. Please wait a moment and try again.');
      return;
    }

    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Order placement failed');
      return;
    }

    trackEvent(AnalyticsEvents.PURCHASE_COMPLETED, { orderNumber: data.orderNumber, total: data.totalAmount });
    sessionStorage.removeItem('checkout_step');
    router.push(`/checkout/confirmation/${data.orderNumber}`);
  }

  if (cartLoading) return <div className="container mx-auto p-8">Loading checkout…</div>;

  return (
    <div className="container mx-auto px-4 py-8 lg:px-8">
      <h1 className="font-display text-3xl font-bold">Checkout</h1>

      {checkoutBlocked && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Some items in your cart are no longer available</p>
            <ul className="mt-2 list-disc pl-4 text-muted-foreground">
              {outOfStock.map((item, i) => (
                <li key={i}>
                  {item.productName} ({item.variantName}) — only {item.available} left
                </li>
              ))}
            </ul>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push('/cart')}>
              Update cart
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-2 overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex items-center gap-2 ${i <= step ? 'text-primary' : 'text-muted-foreground'}`}>
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{i + 1}</span>
            <span className="hidden text-sm sm:inline">{s}</span>
            {i < STEPS.length - 1 && <span className="mx-2 text-muted-foreground">—</span>}
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {step === 0 && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold">Delivery address</h2>
                <p className="text-sm text-muted-foreground">Where should we send your order?</p>
                {addresses.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {addresses.map((addr) => (
                      <label key={addr.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-4">
                        <input type="radio" name="address" checked={selectedAddressId === addr.id} onChange={() => setSelectedAddressId(addr.id)} />
                        <div>
                          <p className="font-medium">{addr.firstName} {addr.lastName}</p>
                          <p className="text-sm text-muted-foreground">{addr.line1}, {addr.city}, {addr.postalCode}</p>
                        </div>
                      </label>
                    ))}
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input type="radio" name="address" checked={!selectedAddressId} onChange={() => setSelectedAddressId(null)} />
                      Add new address
                    </label>
                  </div>
                )}
                {!selectedAddressId && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {(['firstName', 'lastName', 'line1', 'line2', 'city', 'state', 'postalCode', 'phone'] as const).map((field) => (
                      <div key={field}>
                        <Label>{field}</Label>
                        <Input value={newAddress[field]} onChange={(e) => setNewAddress({ ...newAddress, [field]: e.target.value })} />
                      </div>
                    ))}
                  </div>
                )}
                <Button className="mt-6" disabled={checkoutBlocked} onClick={() => setStep(1)}>Continue to shipping</Button>
              </CardContent>
            </Card>
          )}

          {step === 1 && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold">Shipping method</h2>
                <div className="mt-4 space-y-2">
                  {shippingMethods.map((m) => (
                    <label key={m.id} className="flex cursor-pointer items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <input type="radio" checked={shippingMethodId === m.id} onChange={() => setShippingMethodId(m.id)} />
                        <div>
                          <p className="font-medium">{m.name}</p>
                          <p className="text-sm text-muted-foreground">{m.description} · {m.estimatedDaysMin}–{m.estimatedDaysMax} business days</p>
                        </div>
                      </div>
                      <span className="font-semibold">{subtotal >= 7500 && m.price > 0 ? 'Free' : formatPrice(m.price)}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-6 flex gap-2">
                  <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
                  <Button disabled={checkoutBlocked} onClick={() => setStep(2)}>Continue to payment</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold">Payment</h2>
                <p className="text-sm text-muted-foreground">Card details are tokenized in your browser — we never send your full card number to our servers.</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label>Card number</Label>
                    <Input placeholder="4242 4242 4242 4242" value={payment.cardNumber} onChange={(e) => setPayment({ ...payment, cardNumber: e.target.value })} autoComplete="cc-number" />
                    <p className="mt-1 text-xs text-muted-foreground">Test mode: use 4242 4242 4242 4242. Ending 0002 declines.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Expiration</Label><Input placeholder="MM/YY" value={payment.expiry} onChange={(e) => setPayment({ ...payment, expiry: e.target.value })} autoComplete="cc-exp" /></div>
                    <div><Label>CVC</Label><Input placeholder="123" value={payment.cvc} onChange={(e) => setPayment({ ...payment, cvc: e.target.value })} autoComplete="cc-csc" /></div>
                  </div>
                  <div><Label>Name on card</Label><Input value={payment.nameOnCard} onChange={(e) => setPayment({ ...payment, nameOnCard: e.target.value })} autoComplete="cc-name" /></div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Secure checkout · PCI-compliant processing
                </div>
                <div className="mt-6 flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button disabled={checkoutBlocked} onClick={proceedToReview}>Review order</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold">Review order</h2>
                {last4 && <p className="mt-2 text-sm">Payment: {maskCardNumber(last4)}</p>}

                <div className="mt-4 space-y-3 border-b pb-4">
                  <p className="text-sm font-medium">Items</p>
                  {cartItems.map((item) => {
                    const unit = item.unitPrice ?? item.variant.price;
                    return (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.variant.product.name} ({item.variant.name}) × {item.quantity}</span>
                        <span className="tabular-nums">{formatPrice(unit * item.quantity)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex gap-2">
                  <Input
                    placeholder="Promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  />
                  <Button variant="outline" onClick={applyPromo}>Apply</Button>
                </div>
                {promoApplied && (
                  <p className="mt-2 text-sm text-primary">Code {promoApplied} applied — save {formatPrice(promoDiscount)}</p>
                )}
                <p className="mt-4 text-sm text-muted-foreground">By placing your order, you agree to our Terms of Service and <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.</p>
                <div className="mt-6 flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button disabled={loading || checkoutBlocked} onClick={placeOrder}>
                    <Lock className="mr-2 h-4 w-4" /> {loading ? 'Processing…' : 'Place order'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="rounded-lg border bg-card p-6 lg:sticky lg:top-24 lg:h-fit">
          <h2 className="font-semibold">Order summary</h2>
          <div className="mt-4 max-h-48 space-y-2 overflow-y-auto text-sm">
            {cartItems.map((item) => {
              const unit = item.unitPrice ?? item.variant.price;
              return (
                <div key={item.id} className="flex justify-between gap-2">
                  <span className="truncate">{item.variant.product.name} × {item.quantity}</span>
                  <span className="shrink-0 tabular-nums">{formatPrice(unit * item.quantity)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            {promoDiscount > 0 && (
              <div className="flex justify-between text-primary"><span>Discount</span><span>−{formatPrice(promoDiscount)}</span></div>
            )}
            <div className="flex justify-between"><span>Shipping</span><span>{shippingCost === 0 ? 'Free' : formatPrice(shippingCost)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{formatPrice(taxAmount)}</span></div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span>{formatPrice(total)}</span></div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" /> Secure checkout · 30-day returns on non-perishables
          </div>
        </div>
      </div>
    </div>
  );
}
