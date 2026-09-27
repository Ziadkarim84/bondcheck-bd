// One-time "BondCheck Pro" purchase through Google Play Billing.
import {
  initConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  getAvailablePurchases,
  purchaseUpdatedListener,
  purchaseErrorListener,
} from 'expo-iap';
import { useApp } from './store';

export const PRO_SKU = 'bondcheck_pro';

let connected = false;
let price: string | null = null;
let priceListeners: ((p: string | null) => void)[] = [];

export const proPrice = () => price;
export function onProPrice(l: (p: string | null) => void) {
  priceListeners.push(l);
  return () => {
    priceListeners = priceListeners.filter((x) => x !== l);
  };
}

export async function initIap() {
  if (connected) return;
  try {
    await initConnection();
    connected = true;
    purchaseUpdatedListener(async (purchase) => {
      if (purchase.productId === PRO_SKU) {
        useApp.getState().set({ isPro: true });
        try {
          await finishTransaction({ purchase, isConsumable: false });
        } catch {}
      }
    });
    purchaseErrorListener(() => {});
    const products = await fetchProducts({ skus: [PRO_SKU], type: 'in-app' });
    const p = (products ?? []).find((x: any) => x.id === PRO_SKU || x.productId === PRO_SKU) as any;
    price = p?.displayPrice ?? null;
    priceListeners.forEach((l) => l(price));
    await restorePro(true);
  } catch {
    // Billing unavailable (emulator without Play, sideloaded build): Pro just can't be bought.
  }
}

export async function buyPro(): Promise<boolean> {
  if (!connected) await initIap();
  if (!connected) return false;
  try {
    await requestPurchase({ request: { google: { skus: [PRO_SKU] }, apple: { sku: PRO_SKU } }, type: 'in-app' });
    return true;
  } catch {
    return false;
  }
}

/** Re-grants Pro from Google Play's record of past purchases. */
export async function restorePro(silent = false): Promise<boolean> {
  try {
    const purchases = await getAvailablePurchases();
    const owned = (purchases ?? []).some((p: any) => p.productId === PRO_SKU);
    if (owned) useApp.getState().set({ isPro: true });
    return owned;
  } catch {
    if (!silent) throw new Error('restore failed');
    return false;
  }
}
