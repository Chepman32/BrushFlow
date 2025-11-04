import RNIap, {
  Product,
  Purchase,
  PurchaseError,
  requestPurchase,
  getProducts,
  initConnection,
  endConnection,
  finishTransaction,
} from 'react-native-iap';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREMIUM_KEY = '@brushflow:premium';
const PRODUCT_IDS = {
  LIFETIME: 'com.brushflow.premium.lifetime',
  MONTHLY: 'com.brushflow.premium.monthly',
};

export class IAPManager {
  private static instance: IAPManager;
  private isPremiumUser: boolean = false;
  private products: Product[] = [];

  private constructor() {}

  static getInstance(): IAPManager {
    if (!IAPManager.instance) {
      IAPManager.instance = new IAPManager();
    }
    return IAPManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      await initConnection();

      // Check stored premium status
      const stored = await AsyncStorage.getItem(PREMIUM_KEY);
      if (stored) {
        this.isPremiumUser = JSON.parse(stored);
      }

      // Get available products
      this.products = await getProducts({
        skus: [PRODUCT_IDS.LIFETIME, PRODUCT_IDS.MONTHLY],
      });
    } catch (error) {
      console.error('Failed to initialize IAP:', error);
    }
  }

  async getProducts(): Promise<Product[]> {
    return this.products;
  }

  async purchaseProduct(productId: string): Promise<boolean> {
    try {
      const purchase = await requestPurchase({ sku: productId });

      if (purchase) {
        // Validate receipt (basic client-side validation)
        const isValid = await this.validateReceipt(purchase);

        if (isValid) {
          await this.unlockPremium();
          await finishTransaction({ purchase });
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Purchase failed:', error);
      return false;
    }
  }

  async restorePurchases(): Promise<boolean> {
    try {
      // In a real implementation, this would query the App Store
      // For now, just check stored status
      const stored = await AsyncStorage.getItem(PREMIUM_KEY);
      if (stored) {
        this.isPremiumUser = JSON.parse(stored);
        return this.isPremiumUser;
      }
      return false;
    } catch (error) {
      console.error('Restore failed:', error);
      return false;
    }
  }

  isPremium(): boolean {
    return this.isPremiumUser;
  }

  private async validateReceipt(purchase: Purchase): Promise<boolean> {
    // Basic client-side validation
    // In production, this should be done server-side
    return !!purchase.transactionReceipt;
  }

  private async unlockPremium(): Promise<void> {
    this.isPremiumUser = true;
    await AsyncStorage.setItem(PREMIUM_KEY, JSON.stringify(true));
  }

  async cleanup(): Promise<void> {
    await endConnection();
  }
}
