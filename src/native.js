// Ponte entre o jogo (www/index.html) e os plugins nativos do Capacitor.
// No navegador, tudo cai no modo simulado: o jogo usa os próprios diálogos de teste.
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { AdMob, AdmobConsentStatus, RewardAdPluginEvents, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { Purchases, LOG_LEVEL, PURCHASES_ERROR_CODE } from '@revenuecat/purchases-capacitor';

const isNative = Capacitor.isNativePlatform();

/* ---------- salvamento ---------- */
const storage = {
  async get(key) { const { value } = await Preferences.get({ key }); return value; },
  async set(key, value) { await Preferences.set({ key, value }); },
};

/* ---------- vibração ---------- */
function haptic(kind) {
  if (!isNative) return;
  const style = kind === 'done' ? ImpactStyle.Medium : ImpactStyle.Light;
  Haptics.impact({ style }).catch(() => {});
}

/* ---------- anúncios (AdMob) ---------- */
const AD_IDS = { rewarded: __ADMOB_REWARDED_ID__, interstitial: __ADMOB_INTERSTITIAL_ID__ };
const ads = {
  ready: false,
  rewardedLoaded: false,
  interstitialLoaded: false,

  // Ordem: consentimento (UMP) → rastreamento da Apple (ATT) → AdMob.
  async init() {
    if (!isNative) return;
    try {
      let consent = await AdMob.requestConsentInfo();
      if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
        consent = await AdMob.showConsentForm();
      }
      // Se a mensagem do UMP já mostrou o pedido da Apple, o status deixa de ser "notDetermined".
      const { status } = await AdMob.trackingAuthorizationStatus();
      if (status === 'notDetermined') await AdMob.requestTrackingAuthorization();
      if (consent.canRequestAds === false) return;
    } catch (e) { console.warn('Consentimento/ATT', e); }
    try {
      await AdMob.initialize();
      this.ready = true;
      AdMob.addListener(RewardAdPluginEvents.Dismissed, () => this.loadRewarded());
      AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => this.loadInterstitial());
      this.loadRewarded();
      this.loadInterstitial();
    } catch (e) { console.warn('AdMob', e); }
  },

  // Formulário de privacidade (exigido pelo UMP quando o usuário está na Europa).
  async privacyOptionsRequired() {
    if (!isNative) return false;
    try { return (await AdMob.requestConsentInfo()).privacyOptionsRequirementStatus === 'REQUIRED'; } catch (e) { return false; }
  },
  async showPrivacyOptions() { try { await AdMob.showPrivacyOptionsForm(); } catch (e) { console.warn(e); } },

  async loadRewarded() {
    this.rewardedLoaded = false;
    try { await AdMob.prepareRewardVideoAd({ adId: AD_IDS.rewarded }); this.rewardedLoaded = true; } catch (e) { console.warn('rewarded', e); }
  },
  async loadInterstitial() {
    this.interstitialLoaded = false;
    try { await AdMob.prepareInterstitial({ adId: AD_IDS.interstitial }); this.interstitialLoaded = true; } catch (e) { console.warn('interstitial', e); }
  },

  // Resolve 'rewarded' (ganhou), 'closed' (fechou antes do fim) ou 'unavailable' (sem anúncio).
  async showRewarded() {
    if (!this.ready) return 'unavailable';
    if (!this.rewardedLoaded) { await this.loadRewarded(); if (!this.rewardedLoaded) return 'unavailable'; }
    let earned = false;
    const onReward = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { earned = true; });
    try {
      await new Promise((resolve) => {
        let off = [];
        const done = () => { off.forEach(h => h.remove()); resolve(); };
        Promise.all([
          AdMob.addListener(RewardAdPluginEvents.Dismissed, done),
          AdMob.addListener(RewardAdPluginEvents.FailedToShow, done),
        ]).then(hs => { off = hs; AdMob.showRewardVideoAd().catch(done); });
      });
    } finally {
      onReward.remove();
      this.rewardedLoaded = false;
    }
    if (!earned) this.loadRewarded();
    return earned ? 'rewarded' : 'closed';
  },

  // Resolve quando o anúncio fecha (ou na hora, se não houver anúncio carregado).
  async showInterstitial() {
    if (!this.ready || !this.interstitialLoaded) { if (this.ready) this.loadInterstitial(); return; }
    this.interstitialLoaded = false;
    await new Promise((resolve) => {
      let off = [];
      const done = () => { off.forEach(h => h.remove()); resolve(); };
      Promise.all([
        AdMob.addListener(InterstitialAdPluginEvents.Dismissed, done),
        AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, done),
      ]).then(hs => { off = hs; AdMob.showInterstitial().catch(done); });
    });
  },
};

/* ---------- compras (RevenueCat) ---------- */
const RC_KEY = __REVENUECAT_IOS_KEY__;
const PRODUCT_IDS = ['noads', 'coins200', 'coins600', 'coins1500', 'theme_ouro'];
const NON_CONSUMABLES = ['noads', 'theme_ouro'];

const iap = {
  enabled: false,          // false = compras simuladas (navegador ou sem chave)
  products: {},            // id → PurchasesStoreProduct

  async init() {
    if (!isNative || !RC_KEY) return;
    try {
      await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
      await Purchases.configure({ apiKey: RC_KEY });
      this.enabled = true;
      await this.loadProducts();
    } catch (e) { console.warn('RevenueCat', e); }
  },

  async loadProducts() {
    try {
      const { products } = await Purchases.getProducts({ productIdentifiers: PRODUCT_IDS });
      products.forEach(p => { this.products[p.identifier] = p; });
    } catch (e) { console.warn('produtos', e); }
  },

  price(id) { const p = this.products[id]; return p ? p.priceString : null; },

  // Lista de não consumíveis que o usuário possui (noads, theme_ouro).
  ownedFrom(customerInfo) {
    const owned = new Set();
    (customerInfo.nonSubscriptionTransactions || []).forEach(t => {
      if (NON_CONSUMABLES.includes(t.productIdentifier)) owned.add(t.productIdentifier);
    });
    // Também aceita "entitlements" com o mesmo nome, se você criar no painel do RevenueCat.
    Object.keys((customerInfo.entitlements && customerInfo.entitlements.active) || {}).forEach(k => {
      if (NON_CONSUMABLES.includes(k)) owned.add(k);
    });
    return [...owned];
  },

  async owned() {
    if (!this.enabled) return [];
    try { const { customerInfo } = await Purchases.getCustomerInfo(); return this.ownedFrom(customerInfo); }
    catch (e) { return []; }
  },

  // Resolve 'ok', 'cancelled' ou lança erro com mensagem amigável.
  async buy(id) {
    if (!this.products[id]) await this.loadProducts();
    const product = this.products[id];
    if (!product) throw new Error('Produto indisponível no momento.');
    try {
      await Purchases.purchaseStoreProduct({ product });
      return 'ok';
    } catch (e) {
      const cancelled = e && (e.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR || (e.data && e.data.userCancelled) || e.userCancelled);
      if (cancelled) return 'cancelled';
      throw new Error((e && e.message) || 'Não foi possível concluir a compra.');
    }
  },

  async restore() {
    const { customerInfo } = await Purchases.restorePurchases();
    return this.ownedFrom(customerInfo);
  },
};

window.AlquimixNative = { isNative, storage, haptic, ads, iap };
