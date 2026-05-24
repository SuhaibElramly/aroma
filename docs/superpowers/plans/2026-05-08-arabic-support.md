# Arabic Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a bilingual EN/AR toggle to the Aroma admin with full RTL layout flip, Cairo font, and complete Arabic UI translations persisted to `localStorage`.

**Architecture:** `vue-i18n@9` handles translations via two locale files (`en.ts` / `ar.ts`). A `useLocale` composable toggles `document.documentElement.dir` and `lang`, calls `dayjs.locale()`, and persists to `localStorage`. An EN/AR pill in the Topbar triggers the switch. Tailwind `rtl:` variants handle the small number of directional layout fixes.

**Tech Stack:** Vue 3, TypeScript, vue-i18n 9, dayjs (already installed), Tailwind CSS 3

---

## File Map

| Action | File |
|--------|------|
| Create | `aroma-admin/src/locales/en.ts` |
| Create | `aroma-admin/src/locales/ar.ts` |
| Create | `aroma-admin/src/i18n.ts` |
| Create | `aroma-admin/src/composables/useLocale.ts` |
| Modify | `aroma-admin/src/main.ts` |
| Modify | `aroma-admin/src/style.css` |
| Modify | `aroma-admin/src/components/layout/Topbar.vue` |
| Modify | `aroma-admin/src/components/layout/Sidebar.vue` |
| Modify | `aroma-admin/src/components/ui/APagination.vue` |
| Modify | `aroma-admin/src/components/ui/AConfirmDialog.vue` |
| Modify | `aroma-admin/src/views/LoginView.vue` |
| Modify | `aroma-admin/src/views/DashboardView.vue` |
| Modify | `aroma-admin/src/views/OrdersView.vue` |
| Modify | `aroma-admin/src/views/OrderDetailView.vue` |
| Modify | `aroma-admin/src/views/ProductsView.vue` |
| Modify | `aroma-admin/src/views/ProductCreateView.vue` |
| Modify | `aroma-admin/src/views/ProductVariantsView.vue` |
| Modify | `aroma-admin/src/views/BrandsView.vue` |
| Modify | `aroma-admin/src/views/BrandDetailView.vue` |
| Modify | `aroma-admin/src/views/CategoriesView.vue` |
| Modify | `aroma-admin/src/views/UsersView.vue` |
| Modify | `aroma-admin/src/views/UserDetailView.vue` |
| Modify | `aroma-admin/src/views/CouponsView.vue` |
| Modify | `aroma-admin/src/views/SpecTypesView.vue` |

---

## Task 1: Install vue-i18n and scaffold i18n infrastructure

**Files:**
- Modify: `aroma-admin/package.json`
- Create: `aroma-admin/src/i18n.ts`
- Create: `aroma-admin/src/composables/useLocale.ts`
- Modify: `aroma-admin/src/main.ts`

- [x] **Step 1: Install vue-i18n**

```bash
cd aroma-admin
npm install vue-i18n@9
```

Expected: `vue-i18n` appears in `package.json` dependencies.

- [x] **Step 2: Create `src/i18n.ts`**

```ts
// aroma-admin/src/i18n.ts
import { createI18n } from 'vue-i18n'
import en from './locales/en'
import ar from './locales/ar'

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, ar },
})
```

- [x] **Step 3: Create `src/composables/useLocale.ts`**

```ts
// aroma-admin/src/composables/useLocale.ts
import { ref } from 'vue'
import { i18n } from '../i18n'
import dayjs from 'dayjs'
import 'dayjs/locale/ar'

type Locale = 'en' | 'ar'

const locale = ref<Locale>((localStorage.getItem('admin_locale') as Locale) ?? 'en')

export function useLocale() {
  function applyLocale(l: Locale) {
    locale.value = l
    i18n.global.locale.value = l
    document.documentElement.dir  = l === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = l
    dayjs.locale(l)
    localStorage.setItem('admin_locale', l)
  }

  function toggleLocale() {
    applyLocale(locale.value === 'en' ? 'ar' : 'en')
  }

  return { locale, applyLocale, toggleLocale }
}
```

- [x] **Step 4: Update `src/main.ts` to boot with saved locale and register i18n**

Replace the entire file:

```ts
// aroma-admin/src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { i18n } from './i18n'
import { useLocale } from './composables/useLocale'
import './style.css'

// Apply saved locale before mount so dir/lang are set before first paint
const { applyLocale } = useLocale()
const saved = localStorage.getItem('admin_locale')
if (saved === 'ar') applyLocale('ar')

createApp(App).use(createPinia()).use(router).use(i18n).mount('#app')
```

- [x] **Step 5: Create placeholder locale files so the app compiles**

`src/locales/en.ts`:
```ts
export default {}
```

`src/locales/ar.ts`:
```ts
export default {}
```

- [x] **Step 6: Verify app starts**

```bash
npm run dev
```

Expected: App loads at `http://localhost:5173` with no console errors.

- [x] **Step 7: Commit**

```bash
git add aroma-admin/package.json aroma-admin/package-lock.json \
        aroma-admin/src/i18n.ts \
        aroma-admin/src/composables/useLocale.ts \
        aroma-admin/src/main.ts \
        aroma-admin/src/locales/en.ts \
        aroma-admin/src/locales/ar.ts
git commit -m "feat: install vue-i18n and scaffold i18n infrastructure"
```

---

## Task 2: Create locale files (en.ts + ar.ts)

**Files:**
- Modify: `aroma-admin/src/locales/en.ts`
- Modify: `aroma-admin/src/locales/ar.ts`

- [x] **Step 1: Write `src/locales/en.ts`**

```ts
// aroma-admin/src/locales/en.ts
export default {
  common: {
    admin: 'Admin',
    cancel: 'Cancel',
    save: 'Save',
    saveChanges: 'Save Changes',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    create: 'Create',
    view: 'View',
    apply: 'Apply',
    back: 'Back',
    areYouSure: 'Are you sure?',
    cannotUndo: 'This action cannot be undone.',
    confirmDelete: 'Delete "{name}"? This cannot be undone.',
    saveFailed: 'Save failed.',
    deleteFailed: 'Delete failed.',
    noVariants: 'No variants',
    search: 'Search',
    enable: 'Enable',
    disable: 'Disable',
    never: 'Never',
    inUse: 'In use — cannot delete',
  },
  nav: {
    main: 'Main',
    catalog: 'Catalog',
    dashboard: 'Dashboard',
    orders: 'Orders',
    customers: 'Customers',
    products: 'Products',
    specTypes: 'Spec Types',
    brands: 'Brands',
    categories: 'Categories',
    coupons: 'Coupons',
  },
  topbar: {
    signOut: 'Sign out',
    adminConsole: 'Admin Console',
  },
  pageTitles: {
    dashboard: 'Dashboard',
    orders: 'Orders',
    'order-detail': 'Order Detail',
    products: 'Products',
    'product-variants': 'Variants',
    'product-create': 'New Product',
    brands: 'Brands',
    'brand-detail': 'Brand Detail',
    categories: 'Categories',
    users: 'Customers',
    'user-detail': 'Customer Detail',
    coupons: 'Coupons',
    'spec-types': 'Spec Types',
  },
  login: {
    welcomeBack: 'Welcome back',
    subtitle: 'Sign in to manage Aroma Shop',
    email: 'Email address',
    password: 'Password',
    signIn: 'Sign in',
    emailRequired: 'Email is required',
    passwordRequired: 'Password is required',
    invalidCredentials: 'Invalid email or password.',
    footer: 'Aroma Shop · Benghazi, Libya',
  },
  dashboard: {
    greeting: 'Good {period}, {name} 👋',
    period_morning: 'morning',
    period_afternoon: 'afternoon',
    period_evening: 'evening',
    subtitle: "Here's what's happening at Aroma Shop today.",
    totalRevenue: 'Total Revenue',
    totalOrders: 'Total Orders',
    products: 'Products',
    customers: 'Customers',
    vsLastMonth: 'vs. last month',
    recentOrders: 'Recent Orders',
    latestActivity: 'Latest activity',
    viewAll: 'View all →',
    colOrder: 'Order',
    colCustomer: 'Customer',
    colTotal: 'Total',
    colStatus: 'Status',
    colDate: 'Date',
    noOrders: 'No orders yet',
  },
  orders: {
    filterAll: 'All',
    filterPlaced: 'Placed',
    filterConfirmed: 'Confirmed',
    filterPreparing: 'Preparing',
    filterReady: 'Ready',
    filterDelivered: 'Delivered',
    filterCancelled: 'Cancelled',
    colOrderId: 'Order ID',
    colCustomer: 'Customer',
    colItems: 'Items',
    colTotal: 'Total',
    colStatus: 'Status',
    colType: 'Type',
    colDate: 'Date',
    typePickup: 'Pickup',
    typeDelivery: 'Delivery',
    noOrders: 'No orders found',
    noOrdersSub: 'Try a different status filter',
  },
  orderDetail: {
    back: 'Orders',
    colProduct: 'Product',
    colBrand: 'Brand',
    colSize: 'Size',
    colQty: 'Qty',
    colPrice: 'Price',
    orderTotal: 'Order total',
    sectionItems: 'Items',
    sectionDetails: 'Order details',
    sectionTimeline: 'Timeline',
    sectionActions: 'Actions',
    fieldDate: 'Date',
    fieldDelivery: 'Delivery',
    fieldItems: 'Items',
    fieldSubtotal: 'Subtotal',
    fieldTotal: 'Total',
    coupon: 'Coupon',
    pickup: 'Pickup',
    homeDelivery: 'Home delivery',
    customerNote: 'Customer note',
    noteToCustomer: 'Note to customer',
    notePlaceholder: 'Visible to the customer on their order…',
    saveNote: 'Save note',
    updateStatus: 'Update status',
    chooseStatus: 'Choose a status…',
    apply: 'Apply',
    statusPlaced: 'Placed',
    statusConfirmed: 'Confirmed',
    statusPreparing: 'Preparing',
    statusReady: 'Ready for Pickup',
    statusDelivered: 'Delivered',
    statusCancelled: 'Cancelled',
    notFound: 'Order not found.',
    itemCount: '{n} item | {n} items',
  },
  products: {
    addProduct: 'Add Product',
    searchPlaceholder: 'Search AR / EN…',
    labelName: 'Name',
    labelBrand: 'Brand',
    labelCategory: 'Category',
    labelType: 'Type',
    labelPriceMin: 'Price Min (LYD)',
    labelPriceMax: 'Price Max (LYD)',
    allBrands: 'All brands',
    allCategories: 'All categories',
    allTypes: 'All types',
    colName: 'Name',
    colBrand: 'Brand',
    colCategory: 'Category',
    colType: 'Type',
    colPrice: 'Price',
    colFlags: 'Flags',
    colVariants: 'Variants',
    variantsCount: 'Variants ({count})',
    flagNew: 'New',
    modalAddTitle: 'Add Product',
    modalEditTitle: 'Edit Product',
    labelNameAr: 'Name (Arabic)',
    labelNameEn: 'Name (English)',
    labelSlug: 'Slug (URL-safe)',
    labelDescription: 'Description',
    labelPlaceholderBg: 'Placeholder BG color',
    labelPlaceholderDot: 'Placeholder dot color',
    flagNewArrival: 'New arrival',
    flagBestseller: 'Bestseller',
    flagOffer: 'On offer',
    chooseBrand: 'Choose brand…',
    chooseCategory: 'Choose category…',
    chooseType: 'Choose type…',
    noProducts: 'No products',
    noProductsSub: 'Add your first product to get started',
    deleteTitle: 'Delete product?',
    nameRequired: 'Name is required',
    slugRequired: 'Slug is required',
    brandRequired: 'Select a brand',
    categoryRequired: 'Select a category',
    typeRequired: 'Select a type',
  },
  productCreate: {
    breadcrumb: 'Products',
    title: 'New Product',
    saveProduct: 'Save Product',
    sectionName: 'Product Name',
    labelNameAr: 'Arabic Name',
    placeholderNameAr: 'أدخل اسم المنتج',
    hintNameAr: 'Shown to customers in Arabic',
    labelNameEn: 'English Name',
    placeholderNameEn: 'e.g. Oud Royale',
    hintNameEn: 'Used to generate the URL slug',
    slugPrefix: 'aromashop.ly/products/',
    slugAuto: 'Auto-generated',
    slugHint: 'Slug will appear once you type the English name',
    sectionDescription: 'Description',
    placeholderDescription: 'Optional — describe the scent, notes, occasion…',
    sectionImages: 'Images',
    imagesHint: 'First image becomes the thumbnail. Up to 10 images.',
    addImages: 'Add images',
    dropHint: 'or use the button above · JPG, PNG, WebP',
    sectionOrganize: 'Organize',
    labelBrand: 'Brand',
    chooseBrand: 'Choose brand…',
    labelCategory: 'Category',
    chooseCategory: 'Choose category…',
    labelType: 'Type',
    chooseType: 'Choose type…',
    sectionStatus: 'Status',
    flagNewArrival: 'New arrival',
    flagNewArrivalHint: 'Shows a "New" badge in the store',
    flagBestseller: 'Bestseller',
    flagBestsellerHint: 'Highlights this product in lists',
    flagOffer: 'On offer',
    flagOfferHint: 'Marks the product as discounted',
    sectionCardColor: 'Card Color',
    labelBg: 'Background',
    labelAccent: 'Accent',
    preview: 'Preview',
    nameRequired: 'Name is required',
    brandRequired: 'Select a brand',
    categoryRequired: 'Select a category',
    typeRequired: 'Select a type',
  },
  productVariants: {
    breadcrumb: 'Products',
    title: 'Variants & Images',
    sectionImages: 'Images',
    imagesCollapsed: '{n} image | {n} images uploaded',
    imagesExpanded: 'Click any image to set as thumbnail',
    upload: 'Upload',
    collapse: 'Collapse',
    manage: 'Manage',
    thumbnail: 'Thumbnail',
    noImages: 'No images yet',
    noImagesSub: 'Upload images using the button above',
    step1Label: 'Product type',
    step2Label: 'Define variants',
    step3Label: 'Set prices',
    step2Done: '{n} variant generated | {n} variants generated',
    step1Title: 'Step 1 — Product type',
    step1Sub: 'How does this product work in your store?',
    typeSingle: 'Single price',
    typeSingleDesc: 'One size, one price',
    typeMulti: 'Multiple variants',
    typeMultiDesc: 'Different sizes or options with individual prices',
    next: 'Next',
    back: 'Back',
    step2Title: 'Step 2 — Define variants',
    addSpec: 'Add spec type',
    step3Title: 'Step 3 — Set prices',
    saveVariants: 'Save Variants',
    editTitle: 'Edit Variants',
    colVariant: 'Variant',
    colPrice: 'Price (LYD)',
    colStock: 'Stock',
    inStock: 'In stock',
    outOfStock: 'Out of stock',
    addVariant: 'Add Variant',
    saving: 'Saving…',
    noVariantsYet: 'No variants yet',
    noVariantsYetSub: 'Use the wizard above to create your first variant',
  },
  brands: {
    addBrand: 'Add Brand',
    labelName: 'Name',
    labelOrigin: 'Origin',
    labelTagline: 'Tagline',
    labelMinProducts: 'Min Products',
    labelMaxProducts: 'Max Products',
    searchPlaceholder: 'Search AR / EN…',
    originPlaceholder: 'e.g. France',
    taglinePlaceholder: 'Keyword…',
    colId: 'ID',
    colName: 'Name',
    colOrigin: 'Origin',
    colTagline: 'Tagline',
    colProducts: 'Products',
    modalAddTitle: 'Add Brand',
    modalEditTitle: 'Edit Brand',
    labelNameAr: 'Name (Arabic)',
    labelNameEn: 'Name (English)',
    labelOriginField: 'Country of origin',
    labelBg: 'Background colour',
    logoSection: 'Logo (optional)',
    logoUpload: 'Click to upload logo (PNG, JPG — max 2 MB)',
    logoRemove: 'Remove',
    brandIdLabel: 'Brand ID:',
    brandIdHint: 'type English name above…',
    noBrands: 'No brands found',
    deleteTitle: 'Delete brand?',
    deleteWithProducts: 'This brand has {count} products. Reassign them first.',
    nameRequired: 'Name is required',
    colourRequired: 'Colour is required',
    englishRequired: 'English name required to generate the brand ID',
    save: 'Save',
    add: 'Add',
  },
  brandDetail: {
    back: 'Brands',
    colName: 'Name',
    colCategory: 'Category',
    colType: 'Type',
    colPrice: 'Price',
    colFlags: 'Flags',
    colVariants: 'Variants',
    fieldOrigin: 'Origin',
    fieldProducts: 'Products',
    fieldColour: 'Colour',
    allCategories: 'All categories',
    allTypes: 'All types',
    labelName: 'Name',
    labelCategory: 'Category',
    labelType: 'Type',
    labelPriceMin: 'Price Min (LYD)',
    labelPriceMax: 'Price Max (LYD)',
    noProducts: 'No products for this brand',
    deleteTitle: 'Delete product?',
    sectionName: 'Product Name',
    labelNameAr: 'Arabic Name',
    labelNameEn: 'English Name',
    sectionClassification: 'Classification',
    sectionDescription: 'Description',
    sectionStatus: 'Status',
    sectionCardColor: 'Card Color',
    labelBg: 'Background',
    labelAccent: 'Accent',
    preview: 'Preview',
    urlFixed: 'URL slug (fixed)',
  },
  categories: {
    addCategory: 'Add Category',
    labelLabel: 'Label',
    labelBg: 'Background colour',
    labelMinProducts: 'Min Products',
    labelMaxProducts: 'Max Products',
    searchPlaceholder: 'Search label…',
    colId: 'ID',
    colLabel: 'Label',
    colProducts: 'Products',
    modalAddTitle: 'Add Category',
    modalEditTitle: 'Edit Category',
    noCategories: 'No categories found',
    deleteTitle: 'Delete category?',
    deleteMsg: 'Delete "{name}"? Products in this category will lose their category.',
    labelRequired: 'Label is required',
    colourRequired: 'Colour is required',
    save: 'Save',
    add: 'Add',
  },
  users: {
    searchPlaceholder: 'Search by name or email…',
    colName: 'Name',
    colEmail: 'Email',
    colPhone: 'Phone',
    colOrders: 'Orders',
    colJoined: 'Joined',
    orders: 'orders',
    noUsers: 'No customers found',
    noUsersSub: 'Try a different search term',
  },
  userDetail: {
    breadcrumb: 'Customers',
    userLabel: 'User #',
    tabCart: 'Cart',
    tabWishlist: 'Wishlist',
    cartEmpty: 'Cart is empty',
    wishlistEmpty: 'Wishlist is empty',
    qty: 'Qty: {n}',
  },
  coupons: {
    searchPlaceholder: 'Search by code…',
    newCoupon: 'New Coupon',
    colCode: 'Code',
    colType: 'Type',
    colValue: 'Value',
    colMinOrder: 'Min Order',
    colUses: 'Uses',
    colExpires: 'Expires',
    colStatus: 'Status',
    typePercentage: 'Percentage',
    typeFixed: 'Fixed',
    statusActive: 'Active',
    statusInactive: 'Inactive',
    modalAddTitle: 'New Coupon',
    modalEditTitle: 'Edit Coupon',
    labelCode: 'Code (min 4 chars)',
    labelType: 'Type',
    labelValue: 'Value (%)',
    labelValueFixed: 'Value (LYD)',
    labelMinOrder: 'Min Order (LYD)',
    labelMaxUses: 'Max Uses',
    labelExpiresAt: 'Expires At',
    labelActive: 'Active',
    optionPercentage: 'Percentage (%)',
    optionFixed: 'Fixed Amount (LYD)',
    noCoupons: 'No coupons yet',
    deleteTitle: 'Delete coupon?',
    save: 'Save',
    create: 'Create',
  },
  specTypes: {
    title: 'Spec Types',
    subtitle: 'Global list of product specification types (Size, Color, Weight…)',
    newSpecType: 'New Spec Type',
    colName: 'Name',
    colUnit: 'Unit',
    colInUse: 'In Use',
    modalAddTitle: 'New Spec Type',
    modalEditTitle: 'Edit Spec Type',
    labelName: 'Name',
    namePlaceholder: 'e.g. Size, Color, Weight',
    labelUnit: 'Unit (optional)',
    unitPlaceholder: 'e.g. ml, g, oz',
    unitHint: 'Unit is appended to variant values when displayed (e.g. "30ml").',
    inUseSuffix: 'product | products',
    noSpecTypes: 'No spec types yet',
    noSpecTypesSub: 'Create spec types to use as product variant options',
    deleteTitle: 'Delete spec type?',
    deleteMsg: 'This spec type will be permanently removed.',
    nameRequired: 'Name is required',
    save: 'Save',
    create: 'Create',
  },
  pagination: {
    page: 'Page {current} of {last}',
    total: '{n} total',
    prev: '← Prev',
    next: 'Next →',
  },
}
```

- [x] **Step 2: Write `src/locales/ar.ts`**

```ts
// aroma-admin/src/locales/ar.ts
export default {
  common: {
    admin: 'المدير',
    cancel: 'إلغاء',
    save: 'حفظ',
    saveChanges: 'حفظ التغييرات',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',
    create: 'إنشاء',
    view: 'عرض',
    apply: 'تطبيق',
    back: 'رجوع',
    areYouSure: 'هل أنت متأكد؟',
    cannotUndo: 'لا يمكن التراجع عن هذا الإجراء.',
    confirmDelete: 'هل تريد حذف "{name}"؟ لا يمكن التراجع عن هذا.',
    saveFailed: 'فشل الحفظ.',
    deleteFailed: 'فشل الحذف.',
    noVariants: 'لا متغيرات',
    search: 'بحث',
    enable: 'تفعيل',
    disable: 'تعطيل',
    never: 'أبداً',
    inUse: 'قيد الاستخدام — لا يمكن الحذف',
  },
  nav: {
    main: 'الرئيسية',
    catalog: 'الكتالوج',
    dashboard: 'لوحة التحكم',
    orders: 'الطلبات',
    customers: 'العملاء',
    products: 'المنتجات',
    specTypes: 'أنواع المواصفات',
    brands: 'الماركات',
    categories: 'الفئات',
    coupons: 'القسائم',
  },
  topbar: {
    signOut: 'تسجيل الخروج',
    adminConsole: 'لوحة الإدارة',
  },
  pageTitles: {
    dashboard: 'لوحة التحكم',
    orders: 'الطلبات',
    'order-detail': 'تفاصيل الطلب',
    products: 'المنتجات',
    'product-variants': 'المتغيرات',
    'product-create': 'منتج جديد',
    brands: 'الماركات',
    'brand-detail': 'تفاصيل الماركة',
    categories: 'الفئات',
    users: 'العملاء',
    'user-detail': 'تفاصيل العميل',
    coupons: 'القسائم',
    'spec-types': 'أنواع المواصفات',
  },
  login: {
    welcomeBack: 'مرحباً بعودتك',
    subtitle: 'سجّل دخولك لإدارة أروما شوب',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    signIn: 'تسجيل الدخول',
    emailRequired: 'البريد الإلكتروني مطلوب',
    passwordRequired: 'كلمة المرور مطلوبة',
    invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    footer: 'أروما شوب · بنغازي، ليبيا',
  },
  dashboard: {
    greeting: '{period}، {name} 👋',
    period_morning: 'صباح الخير',
    period_afternoon: 'مساء الخير',
    period_evening: 'مساء الخير',
    subtitle: 'إليك ما يحدث في أروما شوب اليوم.',
    totalRevenue: 'إجمالي الإيرادات',
    totalOrders: 'إجمالي الطلبات',
    products: 'المنتجات',
    customers: 'العملاء',
    vsLastMonth: 'مقارنةً بالشهر الماضي',
    recentOrders: 'أحدث الطلبات',
    latestActivity: 'آخر النشاطات',
    viewAll: 'عرض الكل ←',
    colOrder: 'الطلب',
    colCustomer: 'العميل',
    colTotal: 'الإجمالي',
    colStatus: 'الحالة',
    colDate: 'التاريخ',
    noOrders: 'لا توجد طلبات بعد',
  },
  orders: {
    filterAll: 'الكل',
    filterPlaced: 'مقدّم',
    filterConfirmed: 'مؤكّد',
    filterPreparing: 'قيد التحضير',
    filterReady: 'جاهز',
    filterDelivered: 'مُسلَّم',
    filterCancelled: 'ملغى',
    colOrderId: 'رقم الطلب',
    colCustomer: 'العميل',
    colItems: 'المنتجات',
    colTotal: 'الإجمالي',
    colStatus: 'الحالة',
    colType: 'النوع',
    colDate: 'التاريخ',
    typePickup: 'استلام',
    typeDelivery: 'توصيل',
    noOrders: 'لا توجد طلبات',
    noOrdersSub: 'جرّب فلتراً مختلفاً',
  },
  orderDetail: {
    back: 'الطلبات',
    colProduct: 'المنتج',
    colBrand: 'الماركة',
    colSize: 'الحجم',
    colQty: 'الكمية',
    colPrice: 'السعر',
    orderTotal: 'إجمالي الطلب',
    sectionItems: 'المنتجات',
    sectionDetails: 'تفاصيل الطلب',
    sectionTimeline: 'الجدول الزمني',
    sectionActions: 'الإجراءات',
    fieldDate: 'التاريخ',
    fieldDelivery: 'التوصيل',
    fieldItems: 'المنتجات',
    fieldSubtotal: 'المجموع الفرعي',
    fieldTotal: 'الإجمالي',
    coupon: 'القسيمة',
    pickup: 'استلام',
    homeDelivery: 'توصيل للمنزل',
    customerNote: 'ملاحظة العميل',
    noteToCustomer: 'ملاحظة للعميل',
    notePlaceholder: 'مرئية للعميل في طلبه…',
    saveNote: 'حفظ الملاحظة',
    updateStatus: 'تحديث الحالة',
    chooseStatus: 'اختر حالة…',
    apply: 'تطبيق',
    statusPlaced: 'مقدّم',
    statusConfirmed: 'مؤكّد',
    statusPreparing: 'قيد التحضير',
    statusReady: 'جاهز للاستلام',
    statusDelivered: 'مُسلَّم',
    statusCancelled: 'ملغى',
    notFound: 'الطلب غير موجود.',
    itemCount: '{n} منتج | {n} منتجات',
  },
  products: {
    addProduct: 'إضافة منتج',
    searchPlaceholder: 'بحث عربي / إنجليزي…',
    labelName: 'الاسم',
    labelBrand: 'الماركة',
    labelCategory: 'الفئة',
    labelType: 'النوع',
    labelPriceMin: 'أدنى سعر (د.ل)',
    labelPriceMax: 'أعلى سعر (د.ل)',
    allBrands: 'جميع الماركات',
    allCategories: 'جميع الفئات',
    allTypes: 'جميع الأنواع',
    colName: 'الاسم',
    colBrand: 'الماركة',
    colCategory: 'الفئة',
    colType: 'النوع',
    colPrice: 'السعر',
    colFlags: 'العلامات',
    colVariants: 'المتغيرات',
    variantsCount: 'متغيرات ({count})',
    flagNew: 'جديد',
    modalAddTitle: 'إضافة منتج',
    modalEditTitle: 'تعديل منتج',
    labelNameAr: 'الاسم (عربي)',
    labelNameEn: 'الاسم (إنجليزي)',
    labelSlug: 'رابط المنتج',
    labelDescription: 'الوصف',
    labelPlaceholderBg: 'لون خلفية البطاقة',
    labelPlaceholderDot: 'لون نقطة البطاقة',
    flagNewArrival: 'وصول جديد',
    flagBestseller: 'الأكثر مبيعاً',
    flagOffer: 'عرض',
    chooseBrand: 'اختر ماركة…',
    chooseCategory: 'اختر فئة…',
    chooseType: 'اختر نوعاً…',
    noProducts: 'لا توجد منتجات',
    noProductsSub: 'أضف منتجك الأول للبدء',
    deleteTitle: 'حذف المنتج؟',
    nameRequired: 'الاسم مطلوب',
    slugRequired: 'رابط المنتج مطلوب',
    brandRequired: 'اختر ماركة',
    categoryRequired: 'اختر فئة',
    typeRequired: 'اختر نوعاً',
  },
  productCreate: {
    breadcrumb: 'المنتجات',
    title: 'منتج جديد',
    saveProduct: 'حفظ المنتج',
    sectionName: 'اسم المنتج',
    labelNameAr: 'الاسم بالعربية',
    placeholderNameAr: 'أدخل اسم المنتج',
    hintNameAr: 'يُعرض للعملاء باللغة العربية',
    labelNameEn: 'الاسم بالإنجليزية',
    placeholderNameEn: 'e.g. Oud Royale',
    hintNameEn: 'يُستخدم لتوليد رابط المنتج',
    slugPrefix: 'aromashop.ly/products/',
    slugAuto: 'توليد تلقائي',
    slugHint: 'سيظهر الرابط بعد كتابة الاسم الإنجليزي',
    sectionDescription: 'الوصف',
    placeholderDescription: 'اختياري — صف العطر والمكونات والمناسبة…',
    sectionImages: 'الصور',
    imagesHint: 'الصورة الأولى تصبح الصورة المصغرة. حتى ١٠ صور.',
    addImages: 'إضافة صور',
    dropHint: 'أو استخدم الزر أعلاه · JPG، PNG، WebP',
    sectionOrganize: 'التصنيف',
    labelBrand: 'الماركة',
    chooseBrand: 'اختر ماركة…',
    labelCategory: 'الفئة',
    chooseCategory: 'اختر فئة…',
    labelType: 'النوع',
    chooseType: 'اختر نوعاً…',
    sectionStatus: 'الحالة',
    flagNewArrival: 'وصول جديد',
    flagNewArrivalHint: 'يعرض شارة "جديد" في المتجر',
    flagBestseller: 'الأكثر مبيعاً',
    flagBestsellerHint: 'يبرز المنتج في القوائم',
    flagOffer: 'عرض',
    flagOfferHint: 'يضع علامة خصم على المنتج',
    sectionCardColor: 'لون البطاقة',
    labelBg: 'الخلفية',
    labelAccent: 'اللون المميز',
    preview: 'معاينة',
    nameRequired: 'الاسم مطلوب',
    brandRequired: 'اختر ماركة',
    categoryRequired: 'اختر فئة',
    typeRequired: 'اختر نوعاً',
  },
  productVariants: {
    breadcrumb: 'المنتجات',
    title: 'المتغيرات والصور',
    sectionImages: 'الصور',
    imagesCollapsed: '{n} صورة | {n} صور مرفوعة',
    imagesExpanded: 'اضغط على أي صورة لتعيينها كصورة مصغرة',
    upload: 'رفع',
    collapse: 'طي',
    manage: 'إدارة',
    thumbnail: 'مصغرة',
    noImages: 'لا توجد صور بعد',
    noImagesSub: 'ارفع الصور باستخدام الزر أعلاه',
    step1Label: 'نوع المنتج',
    step2Label: 'تحديد المتغيرات',
    step3Label: 'تحديد الأسعار',
    step2Done: '{n} متغير | {n} متغيرات',
    step1Title: 'الخطوة ١ — نوع المنتج',
    step1Sub: 'كيف يعمل هذا المنتج في متجرك؟',
    typeSingle: 'سعر واحد',
    typeSingleDesc: 'حجم واحد وسعر واحد',
    typeMulti: 'متغيرات متعددة',
    typeMultiDesc: 'أحجام أو خيارات مختلفة بأسعار منفردة',
    next: 'التالي',
    back: 'السابق',
    step2Title: 'الخطوة ٢ — تحديد المتغيرات',
    addSpec: 'إضافة نوع مواصفة',
    step3Title: 'الخطوة ٣ — تحديد الأسعار',
    saveVariants: 'حفظ المتغيرات',
    editTitle: 'تعديل المتغيرات',
    colVariant: 'المتغير',
    colPrice: 'السعر (د.ل)',
    colStock: 'المخزون',
    inStock: 'متوفر',
    outOfStock: 'نفد المخزون',
    addVariant: 'إضافة متغير',
    saving: 'جاري الحفظ…',
    noVariantsYet: 'لا متغيرات بعد',
    noVariantsYetSub: 'استخدم الخطوات أعلاه لإنشاء أول متغير',
  },
  brands: {
    addBrand: 'إضافة ماركة',
    labelName: 'الاسم',
    labelOrigin: 'المنشأ',
    labelTagline: 'الشعار',
    labelMinProducts: 'أدنى عدد منتجات',
    labelMaxProducts: 'أعلى عدد منتجات',
    searchPlaceholder: 'بحث عربي / إنجليزي…',
    originPlaceholder: 'مثال: فرنسا',
    taglinePlaceholder: 'كلمة مفتاحية…',
    colId: 'المعرّف',
    colName: 'الاسم',
    colOrigin: 'المنشأ',
    colTagline: 'الشعار',
    colProducts: 'المنتجات',
    modalAddTitle: 'إضافة ماركة',
    modalEditTitle: 'تعديل ماركة',
    labelNameAr: 'الاسم (عربي)',
    labelNameEn: 'الاسم (إنجليزي)',
    labelOriginField: 'بلد المنشأ',
    labelBg: 'لون الخلفية',
    logoSection: 'الشعار (اختياري)',
    logoUpload: 'اضغط لرفع الشعار (PNG، JPG — حتى ٢ ميغابايت)',
    logoRemove: 'إزالة',
    brandIdLabel: 'معرّف الماركة:',
    brandIdHint: 'اكتب الاسم الإنجليزي أعلاه…',
    noBrands: 'لا توجد ماركات',
    deleteTitle: 'حذف الماركة؟',
    deleteWithProducts: 'هذه الماركة لديها {count} منتج. أعد تعيينها أولاً.',
    nameRequired: 'الاسم مطلوب',
    colourRequired: 'اللون مطلوب',
    englishRequired: 'الاسم الإنجليزي مطلوب لتوليد معرّف الماركة',
    save: 'حفظ',
    add: 'إضافة',
  },
  brandDetail: {
    back: 'الماركات',
    colName: 'الاسم',
    colCategory: 'الفئة',
    colType: 'النوع',
    colPrice: 'السعر',
    colFlags: 'العلامات',
    colVariants: 'المتغيرات',
    fieldOrigin: 'المنشأ',
    fieldProducts: 'المنتجات',
    fieldColour: 'اللون',
    allCategories: 'جميع الفئات',
    allTypes: 'جميع الأنواع',
    labelName: 'الاسم',
    labelCategory: 'الفئة',
    labelType: 'النوع',
    labelPriceMin: 'أدنى سعر (د.ل)',
    labelPriceMax: 'أعلى سعر (د.ل)',
    noProducts: 'لا توجد منتجات لهذه الماركة',
    deleteTitle: 'حذف المنتج؟',
    sectionName: 'اسم المنتج',
    labelNameAr: 'الاسم بالعربية',
    labelNameEn: 'الاسم بالإنجليزية',
    sectionClassification: 'التصنيف',
    sectionDescription: 'الوصف',
    sectionStatus: 'الحالة',
    sectionCardColor: 'لون البطاقة',
    labelBg: 'الخلفية',
    labelAccent: 'اللون المميز',
    preview: 'معاينة',
    urlFixed: 'رابط المنتج (ثابت)',
  },
  categories: {
    addCategory: 'إضافة فئة',
    labelLabel: 'التسمية',
    labelBg: 'لون الخلفية',
    labelMinProducts: 'أدنى عدد منتجات',
    labelMaxProducts: 'أعلى عدد منتجات',
    searchPlaceholder: 'بحث في التسميات…',
    colId: 'المعرّف',
    colLabel: 'التسمية',
    colProducts: 'المنتجات',
    modalAddTitle: 'إضافة فئة',
    modalEditTitle: 'تعديل فئة',
    noCategories: 'لا توجد فئات',
    deleteTitle: 'حذف الفئة؟',
    deleteMsg: 'هل تريد حذف "{name}"؟ ستفقد منتجات هذه الفئة تصنيفها.',
    labelRequired: 'التسمية مطلوبة',
    colourRequired: 'اللون مطلوب',
    save: 'حفظ',
    add: 'إضافة',
  },
  users: {
    searchPlaceholder: 'البحث بالاسم أو البريد…',
    colName: 'الاسم',
    colEmail: 'البريد الإلكتروني',
    colPhone: 'الهاتف',
    colOrders: 'الطلبات',
    colJoined: 'تاريخ الانضمام',
    orders: 'طلبات',
    noUsers: 'لا يوجد عملاء',
    noUsersSub: 'جرّب بحثاً مختلفاً',
  },
  userDetail: {
    breadcrumb: 'العملاء',
    userLabel: 'مستخدم #',
    tabCart: 'السلة',
    tabWishlist: 'المفضلة',
    cartEmpty: 'السلة فارغة',
    wishlistEmpty: 'المفضلة فارغة',
    qty: 'الكمية: {n}',
  },
  coupons: {
    searchPlaceholder: 'بحث بالكود…',
    newCoupon: 'قسيمة جديدة',
    colCode: 'الكود',
    colType: 'النوع',
    colValue: 'القيمة',
    colMinOrder: 'الحد الأدنى',
    colUses: 'الاستخدامات',
    colExpires: 'تنتهي في',
    colStatus: 'الحالة',
    typePercentage: 'نسبة مئوية',
    typeFixed: 'مبلغ ثابت',
    statusActive: 'مفعّل',
    statusInactive: 'معطّل',
    modalAddTitle: 'قسيمة جديدة',
    modalEditTitle: 'تعديل القسيمة',
    labelCode: 'الكود (٤ أحرف على الأقل)',
    labelType: 'النوع',
    labelValue: 'القيمة (%)',
    labelValueFixed: 'القيمة (د.ل)',
    labelMinOrder: 'الحد الأدنى للطلب (د.ل)',
    labelMaxUses: 'الحد الأقصى للاستخدام',
    labelExpiresAt: 'تاريخ الانتهاء',
    labelActive: 'مفعّل',
    optionPercentage: 'نسبة مئوية (%)',
    optionFixed: 'مبلغ ثابت (د.ل)',
    noCoupons: 'لا توجد قسائم بعد',
    deleteTitle: 'حذف القسيمة؟',
    save: 'حفظ',
    create: 'إنشاء',
  },
  specTypes: {
    title: 'أنواع المواصفات',
    subtitle: 'قائمة مواصفات المنتج العامة (الحجم، اللون، الوزن…)',
    newSpecType: 'نوع مواصفة جديد',
    colName: 'الاسم',
    colUnit: 'الوحدة',
    colInUse: 'قيد الاستخدام',
    modalAddTitle: 'نوع مواصفة جديد',
    modalEditTitle: 'تعديل نوع المواصفة',
    labelName: 'الاسم',
    namePlaceholder: 'مثال: الحجم، اللون، الوزن',
    labelUnit: 'الوحدة (اختياري)',
    unitPlaceholder: 'مثال: مل، جرام، أوز',
    unitHint: 'تُضاف الوحدة لقيم المتغيرات عند عرضها (مثال: "٣٠مل").',
    inUseSuffix: 'منتج | منتجات',
    noSpecTypes: 'لا توجد أنواع مواصفات بعد',
    noSpecTypesSub: 'أنشئ أنواع مواصفات لاستخدامها كخيارات متغيرات المنتج',
    deleteTitle: 'حذف نوع المواصفة؟',
    deleteMsg: 'سيتم إزالة نوع المواصفة هذا نهائياً.',
    nameRequired: 'الاسم مطلوب',
    save: 'حفظ',
    create: 'إنشاء',
  },
  pagination: {
    page: 'صفحة {current} من {last}',
    total: '{n} إجمالي',
    prev: 'السابق →',
    next: '← التالي',
  },
}
```

- [x] **Step 3: Verify app compiles**

```bash
npm run build 2>&1 | tail -5
```

Expected: Build succeeds with no TypeScript errors.

- [x] **Step 4: Commit**

```bash
git add aroma-admin/src/locales/en.ts aroma-admin/src/locales/ar.ts
git commit -m "feat: add English and Arabic locale files"
```

---

## Task 3: Font and RTL CSS

**Files:**
- Modify: `aroma-admin/src/style.css`

- [x] **Step 1: Update Google Fonts import and add RTL font rule**

At the top of `src/style.css`, replace the existing `@import` line with:

```css
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
```

Then add this rule inside `@layer base` (after the `body` block):

```css
:root:is([dir="rtl"]) {
  font-family: 'Cairo', system-ui, sans-serif;
}
```

The full updated `@layer base` opening should look like:

```css
@layer base {
  *, *::before, *::after { box-sizing: border-box; }
  html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  body {
    background-color: oklch(97.2% 0.009 255);
    color: oklch(18% 0.008 240);
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    min-height: 100vh;
  }
  :root:is([dir="rtl"]) {
    font-family: 'Cairo', system-ui, sans-serif;
  }
  /* ... rest unchanged */
```

- [x] **Step 2: Verify font loads in browser**

```bash
npm run dev
```

Open `http://localhost:5173` and in DevTools → Network → filter "cairo" — the font should appear (or be cached). No new console errors.

- [x] **Step 3: Commit**

```bash
git add aroma-admin/src/style.css
git commit -m "feat: add Cairo font for Arabic RTL mode"
```

---

## Task 4: Language toggle and layout RTL fixes

**Files:**
- Modify: `aroma-admin/src/components/layout/Topbar.vue`
- Modify: `aroma-admin/src/components/layout/Sidebar.vue`

- [x] **Step 1: Rewrite `Topbar.vue`**

Replace the entire file:

```vue
<template>
  <header class="flex h-14 items-center justify-between border-b border-dash-border bg-dash-surface px-6 shrink-0">
    <!-- Page context -->
    <div class="flex flex-col min-w-0">
      <h1 class="text-sm font-semibold text-dash-text leading-none">{{ pageTitle }}</h1>
      <p class="text-2xs text-dash-muted mt-0.5">{{ todayFormatted }}</p>
    </div>

    <!-- Center: language toggle -->
    <div class="flex items-center gap-0.5 rounded-lg border border-dash-border bg-dash-bg p-0.5">
      <button
        v-for="lang in (['en', 'ar'] as const)"
        :key="lang"
        @click="setLocale(lang)"
        :class="[
          'rounded-md px-3 py-1 text-xs font-semibold transition-all',
          locale === lang
            ? 'bg-dash-secondary text-white shadow-sm'
            : 'text-dash-muted hover:text-dash-text',
        ]"
      >{{ lang.toUpperCase() }}</button>
    </div>

    <!-- Profile -->
    <button @click="handleLogout" class="flex items-center gap-2.5 rounded-xl px-3 py-1.5 hover:bg-dash-bg transition-colors group">
      <div class="h-7 w-7 rounded-full bg-dash-secondary flex items-center justify-center text-white text-xs font-semibold shrink-0">
        {{ initial }}
      </div>
      <div class="text-left rtl:text-right hidden sm:block">
        <p class="text-xs font-medium text-dash-text leading-none">{{ auth.user?.name ?? t('common.admin') }}</p>
        <p class="text-2xs text-dash-muted mt-0.5 group-hover:text-dash-danger transition-colors">{{ t('topbar.signOut') }}</p>
      </div>
      <LogOut :size="13" class="text-dash-faint group-hover:text-dash-danger transition-colors rtl:scale-x-[-1]" />
    </button>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { LogOut } from 'lucide-vue-next'
import dayjs from 'dayjs'
import { useAuthStore } from '../../stores/auth'
import { useLocale } from '../../composables/useLocale'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()
const { t }  = useI18n()
const { locale, applyLocale } = useLocale()

function setLocale(l: 'en' | 'ar') {
  applyLocale(l)
}

const pageTitle = computed(() => {
  const name = route.name as string
  const key = `pageTitles.${name}`
  return t(key, t('common.admin'))
})

const todayFormatted = computed(() => {
  locale.value // reactive dependency so date re-renders on locale change
  return dayjs().format('dddd, MMMM D')
})

const initial = computed(() => (auth.user?.name ?? 'A')[0].toUpperCase())

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>
```

- [x] **Step 2: Update `Sidebar.vue` with RTL variants and translations**

Replace the entire file:

```vue
<template>
  <aside class="flex h-screen w-60 flex-col shrink-0 bg-dash-surface border-r border-dash-border rtl:border-r-0 rtl:border-l">
    <!-- Logo -->
    <div class="flex items-center gap-3 px-5 py-5">
      <div class="h-9 w-9 rounded-xl bg-dash-primary flex items-center justify-center shrink-0 shadow-sm">
        <span class="text-[11px] font-bold text-white tracking-widest">AR</span>
      </div>
      <div>
        <p class="text-sm font-semibold text-dash-text leading-none">Aroma</p>
        <p class="text-2xs text-dash-muted mt-0.5">{{ t('topbar.adminConsole') }}</p>
      </div>
    </div>

    <!-- Divider -->
    <div class="mx-5 h-px bg-dash-border" />

    <!-- Nav -->
    <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      <p class="px-3 mb-2 text-2xs font-semibold text-dash-faint uppercase tracking-widest">{{ t('nav.main') }}</p>
      <RouterLink
        v-for="item in mainItems"
        :key="item.to"
        :to="item.to"
        custom
        v-slot="{ navigate, isActive }"
      >
        <button
          @click="navigate"
          :class="[
            'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 text-left rtl:text-right group',
            isActive
              ? 'bg-dash-secondary text-white shadow-sm'
              : 'text-dash-muted hover:bg-dash-bg hover:text-dash-text',
          ]"
        >
          <component
            :is="item.icon"
            :size="16"
            :class="isActive ? 'text-white' : 'text-dash-faint group-hover:text-dash-primary transition-colors'"
          />
          <span>{{ item.label }}</span>
          <span
            v-if="item.badge"
            :class="[
              'ml-auto rtl:ml-0 rtl:mr-auto text-2xs font-semibold rounded-full px-1.5 py-0.5',
              isActive ? 'bg-white/20 text-white' : 'bg-dash-primary-lt text-dash-primary',
            ]"
          >{{ item.badge }}</span>
        </button>
      </RouterLink>

      <p class="px-3 mt-4 mb-2 text-2xs font-semibold text-dash-faint uppercase tracking-widest">{{ t('nav.catalog') }}</p>
      <RouterLink
        v-for="item in catalogItems"
        :key="item.to"
        :to="item.to"
        custom
        v-slot="{ navigate, isActive }"
      >
        <button
          @click="navigate"
          :class="[
            'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 text-left rtl:text-right group',
            isActive
              ? 'bg-dash-secondary text-white shadow-sm'
              : 'text-dash-muted hover:bg-dash-bg hover:text-dash-text',
          ]"
        >
          <component
            :is="item.icon"
            :size="16"
            :class="isActive ? 'text-white' : 'text-dash-faint group-hover:text-dash-primary transition-colors'"
          />
          <span>{{ item.label }}</span>
        </button>
      </RouterLink>
    </nav>

    <!-- Footer -->
    <div class="px-5 py-4 border-t border-dash-border">
      <div class="flex items-center gap-2.5">
        <div class="h-7 w-7 rounded-full bg-dash-secondary-lt flex items-center justify-center text-dash-secondary text-2xs font-semibold shrink-0">
          A
        </div>
        <div class="min-w-0">
          <p class="text-xs font-medium text-dash-text truncate">{{ t('common.admin') }}</p>
          <p class="text-2xs text-dash-faint truncate">aromashop.ly</p>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { LayoutDashboard, ShoppingBag, Package, Tag, Grid3X3, Users, Ticket, SlidersHorizontal } from 'lucide-vue-next'

const { t } = useI18n()

const mainItems = computed(() => [
  { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
  { to: '/orders',    label: t('nav.orders'),    icon: ShoppingBag },
  { to: '/users',     label: t('nav.customers'), icon: Users },
])

const catalogItems = computed(() => [
  { to: '/products',   label: t('nav.products'),   icon: Package },
  { to: '/spec-types', label: t('nav.specTypes'),  icon: SlidersHorizontal },
  { to: '/brands',     label: t('nav.brands'),     icon: Tag },
  { to: '/categories', label: t('nav.categories'), icon: Grid3X3 },
  { to: '/coupons',    label: t('nav.coupons'),    icon: Ticket },
])
</script>
```

- [x] **Step 3: Smoke test — toggle the locale**

```bash
npm run dev
```

1. Open `http://localhost:5173` → login → sidebar shows English labels.
2. Click **AR** in the topbar pill → layout flips to RTL, sidebar border moves to left, labels change to Arabic, font changes to Cairo, date shows in Arabic.
3. Refresh the page → Arabic persists.
4. Click **EN** → back to English LTR.

- [x] **Step 4: Commit**

```bash
git add aroma-admin/src/components/layout/Topbar.vue \
        aroma-admin/src/components/layout/Sidebar.vue
git commit -m "feat: add language toggle to topbar, apply RTL variants to layout"
```

---

## Task 5: Translate shared UI components

**Files:**
- Modify: `aroma-admin/src/components/ui/APagination.vue`
- Modify: `aroma-admin/src/components/ui/AConfirmDialog.vue`

- [x] **Step 1: Update `APagination.vue`**

Replace the entire file:

```vue
<template>
  <div
    v-if="meta && meta.lastPage > 1"
    class="flex items-center justify-between pt-4 text-xs text-dash-muted"
  >
    <span class="text-2xs">
      {{ t('pagination.page', { current: meta.currentPage, last: meta.lastPage }) }}
      <span class="text-dash-faint">&nbsp;·&nbsp; {{ t('pagination.total', { n: meta.total }) }}</span>
    </span>
    <div class="flex gap-1.5">
      <button
        @click="$emit('change', meta!.currentPage - 1)"
        :disabled="meta.currentPage <= 1"
        class="rounded-btn border border-dash-border px-3 py-1.5 text-xs hover:bg-dash-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >{{ t('pagination.prev') }}</button>
      <button
        @click="$emit('change', meta!.currentPage + 1)"
        :disabled="meta.currentPage >= meta.lastPage"
        class="rounded-btn border border-dash-border px-3 py-1.5 text-xs hover:bg-dash-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >{{ t('pagination.next') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PageMeta } from '../../types'
defineProps<{ meta: PageMeta | null }>()
defineEmits<{ change: [page: number] }>()
const { t } = useI18n()
</script>
```

- [x] **Step 2: Update `AConfirmDialog.vue`**

Replace the entire file:

```vue
<template>
  <AModal :open="open" :title="title ?? t('common.areYouSure')" @close="$emit('cancel')">
    <p class="text-sm text-dash-muted">{{ message ?? t('common.cannotUndo') }}</p>
    <template #footer>
      <AButton variant="secondary" size="sm" @click="$emit('cancel')">{{ t('common.cancel') }}</AButton>
      <AButton variant="danger" size="sm" :loading="loading" @click="$emit('confirm')">
        {{ confirmLabel ?? t('common.delete') }}
      </AButton>
    </template>
  </AModal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AModal from './AModal.vue'
import AButton from './AButton.vue'

defineProps<{
  open: boolean
  title?: string
  message?: string
  confirmLabel?: string
  loading?: boolean
}>()
defineEmits<{ confirm: []; cancel: [] }>()

const { t } = useI18n()
</script>
```

- [x] **Step 3: Commit**

```bash
git add aroma-admin/src/components/ui/APagination.vue \
        aroma-admin/src/components/ui/AConfirmDialog.vue
git commit -m "feat: translate APagination and AConfirmDialog"
```

---

## Task 6: Translate LoginView

**Files:**
- Modify: `aroma-admin/src/views/LoginView.vue`

- [x] **Step 1: Update `LoginView.vue`**

In the `<template>` section, replace all hardcoded strings:

```vue
<template>
  <div class="flex min-h-screen items-center justify-center bg-dash-bg px-4">
    <div class="w-full max-w-sm">
      <!-- Brand mark -->
      <div class="mb-8 text-center">
        <div class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-dash-primary shadow-card">
          <span class="text-sm font-bold text-white tracking-[0.15em]">AR</span>
        </div>
        <h1 class="text-lg font-semibold text-dash-text">{{ t('login.welcomeBack') }}</h1>
        <p class="mt-1.5 text-xs text-dash-muted">{{ t('login.subtitle') }}</p>
      </div>

      <!-- Form card -->
      <div class="rounded-card bg-dash-surface border border-dash-border p-7 shadow-card">
        <form @submit.prevent="handleLogin" class="space-y-4" novalidate>
          <AInput
            v-model="email"
            :label="t('login.email')"
            type="email"
            placeholder="admin@aroma.ly"
            autocomplete="email"
            :error="errors.email"
          />
          <AInput
            v-model="password"
            :label="t('login.password')"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            :error="errors.password"
          />
          <div
            v-if="errors.general"
            class="rounded-btn bg-dash-danger-lt border border-dash-danger/20 px-3 py-2.5 text-xs text-dash-danger"
          >
            {{ errors.general }}
          </div>
          <AButton type="submit" class="w-full justify-center mt-2" :loading="loading">
            {{ t('login.signIn') }}
          </AButton>
        </form>
      </div>

      <p class="mt-6 text-center text-2xs text-dash-faint">
        {{ t('login.footer') }}
      </p>
    </div>
  </div>
</template>
```

In the `<script setup>` section, add `useI18n` and replace hardcoded error strings:

```ts
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import AInput  from '../components/ui/AInput.vue'
import AButton from '../components/ui/AButton.vue'

const router   = useRouter()
const auth     = useAuthStore()
const { t }    = useI18n()
const email    = ref('')
const password = ref('')
const loading  = ref(false)
const errors   = ref<Record<string, string>>({})

async function handleLogin() {
  errors.value = {}
  if (!email.value)    { errors.value.email    = t('login.emailRequired');    return }
  if (!password.value) { errors.value.password = t('login.passwordRequired'); return }

  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push({ name: 'dashboard' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : t('login.invalidCredentials')
    errors.value.general = msg.includes('admin') ? msg : t('login.invalidCredentials')
  } finally {
    loading.value = false
  }
}
```

- [x] **Step 2: Verify in browser**

Switch to Arabic → visit `/login` → all text renders in Arabic, layout is RTL.

- [x] **Step 3: Commit**

```bash
git add aroma-admin/src/views/LoginView.vue
git commit -m "feat: translate LoginView"
```

---

## Task 7: Translate DashboardView

**Files:**
- Modify: `aroma-admin/src/views/DashboardView.vue`

- [x] **Step 1: Update `<script setup>` in `DashboardView.vue`**

Add `useI18n` and `useLocale`, and replace the `greeting` computed:

```ts
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { TrendingUp, ShoppingBag, Package, Users } from 'lucide-vue-next'
import { apiGetStats } from '../api/admin'
import type { DashboardStats, RecentOrderRow } from '../types'
import { useAuthStore } from '../stores/auth'
import { useLocale } from '../composables/useLocale'
import AStatCard       from '../components/ui/AStatCard.vue'
import ABadge          from '../components/ui/ABadge.vue'
import AEmptyState     from '../components/ui/AEmptyState.vue'
import AreaChart       from '../components/charts/AreaChart.vue'
import BarChart        from '../components/charts/BarChart.vue'
import ComparisonChart from '../components/charts/ComparisonChart.vue'

const router  = useRouter()
const auth    = useAuthStore()
const { t }   = useI18n()
const { locale } = useLocale()
const stats   = ref<DashboardStats | null>(null)
const loading = ref(true)
const error   = ref<string | null>(null)

const period = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return t('dashboard.period_morning')
  if (h < 18) return t('dashboard.period_afternoon')
  return t('dashboard.period_evening')
})

const greetingText = computed(() =>
  t('dashboard.greeting', { period: period.value, name: auth.user?.name ?? t('common.admin') })
)

const zeros12   = Array(12).fill(0)
const zeros7    = Array(7).fill(0)
const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const weekLabels  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

onMounted(async () => {
  try {
    const res = await apiGetStats()
    stats.value = res.data
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load dashboard data.'
  } finally {
    loading.value = false
  }
})
```

- [x] **Step 2: Update `<template>` strings in `DashboardView.vue`**

Replace hardcoded strings in the template. Key changes:

```vue
<!-- Welcome -->
<h2 class="text-lg font-semibold text-dash-text">{{ greetingText }}</h2>
<p class="text-sm text-dash-muted mt-0.5">{{ t('dashboard.subtitle') }}</p>

<!-- Stat cards -->
<AStatCard :label="t('dashboard.totalRevenue')" ... :sub="t('dashboard.vsLastMonth')" ... />
<AStatCard :label="t('dashboard.totalOrders')" ... />
<AStatCard :label="t('dashboard.products')" ... />
<AStatCard :label="t('dashboard.customers')" ... />

<!-- Recent orders section header -->
<h3 class="text-sm font-semibold text-dash-text">{{ t('dashboard.recentOrders') }}</h3>
<p class="text-2xs text-dash-muted mt-0.5">{{ t('dashboard.latestActivity') }}</p>
<RouterLink to="/orders" ...>{{ t('dashboard.viewAll') }}</RouterLink>

<!-- Table headers -->
<th ...>{{ t('dashboard.colOrder') }}</th>
<th ...>{{ t('dashboard.colCustomer') }}</th>
<th ...>{{ t('dashboard.colTotal') }}</th>
<th ...>{{ t('dashboard.colStatus') }}</th>
<th ...>{{ t('dashboard.colDate') }}</th>

<!-- Empty state -->
<AEmptyState :icon="ShoppingBag" :heading="t('dashboard.noOrders')" />
```

Also add `rtl:text-right` to the `<th>` elements that use `text-left`:
```vue
<th class="pb-3 text-left rtl:text-right text-2xs font-semibold text-dash-faint uppercase tracking-wider">
```

- [x] **Step 3: Commit**

```bash
git add aroma-admin/src/views/DashboardView.vue
git commit -m "feat: translate DashboardView"
```

---

## Task 8: Translate OrdersView and OrderDetailView

**Files:**
- Modify: `aroma-admin/src/views/OrdersView.vue`
- Modify: `aroma-admin/src/views/OrderDetailView.vue`

- [x] **Step 1: Update `OrdersView.vue`**

Add `useI18n` import and make `statusOptions` and `cols` computed:

```ts
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
// ... other imports unchanged

const { t } = useI18n()

const statusOptions = computed(() => [
  { value: '',          label: t('orders.filterAll') },
  { value: 'placed',    label: t('orders.filterPlaced') },
  { value: 'confirmed', label: t('orders.filterConfirmed') },
  { value: 'preparing', label: t('orders.filterPreparing') },
  { value: 'ready',     label: t('orders.filterReady') },
  { value: 'delivered', label: t('orders.filterDelivered') },
  { value: 'cancelled', label: t('orders.filterCancelled') },
])

const cols = computed(() => [
  { key: 'id',        label: t('orders.colOrderId') },
  { key: 'user',      label: t('orders.colCustomer') },
  { key: 'itemCount', label: t('orders.colItems') },
  { key: 'total',     label: t('orders.colTotal') },
  { key: 'status',    label: t('orders.colStatus') },
  { key: 'isPickup',  label: t('orders.colType') },
  { key: 'date',      label: t('orders.colDate') },
])
```

In the template, replace the pickup/delivery badge and empty state:

```vue
<span ...>{{ value ? t('orders.typePickup') : t('orders.typeDelivery') }}</span>

<AEmptyState :icon="ShoppingBag" :heading="t('orders.noOrders')" :sub="t('orders.noOrdersSub')" />
```

- [x] **Step 2: Update `OrderDetailView.vue`**

Add `useI18n` and translate the back link, section headers, table headers, status options, and action labels:

```ts
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const statusOptions = computed(() => [
  { value: 'placed',    label: t('orderDetail.statusPlaced') },
  { value: 'confirmed', label: t('orderDetail.statusConfirmed') },
  { value: 'preparing', label: t('orderDetail.statusPreparing') },
  { value: 'ready',     label: t('orderDetail.statusReady') },
  { value: 'delivered', label: t('orderDetail.statusDelivered') },
  { value: 'cancelled', label: t('orderDetail.statusCancelled') },
])
```

Key template replacements:

```vue
<!-- Back link -->
<RouterLink to="/orders" ...><ArrowLeft :size="12" />{{ t('orderDetail.back') }}</RouterLink>

<!-- Table headers -->
<th ...>{{ t('orderDetail.colProduct') }}</th>
<th ...>{{ t('orderDetail.colBrand') }}</th>
<th ...>{{ t('orderDetail.colSize') }}</th>
<th ...>{{ t('orderDetail.colQty') }}</th>
<th ...>{{ t('orderDetail.colPrice') }}</th>
<td colspan="4" ...>{{ t('orderDetail.orderTotal') }}</td>

<!-- Section headings -->
<p ...>{{ t('orderDetail.sectionItems') }}</p>
<p ...>{{ t('orderDetail.sectionDetails') }}</p>
<p ...>{{ t('orderDetail.sectionTimeline') }}</p>
<p ...>{{ t('orderDetail.sectionActions') }}</p>

<!-- Detail rows -->
<span ...>{{ t('orderDetail.fieldDate') }}</span>
<span ...>{{ t('orderDetail.fieldDelivery') }}</span>
<span ...>{{ order.isPickup ? t('orderDetail.pickup') : t('orderDetail.homeDelivery') }}</span>
<span ...>{{ t('orderDetail.fieldTotal') }}</span>

<!-- Actions panel -->
<ASelect :label="t('orderDetail.updateStatus')" :placeholder="t('orderDetail.chooseStatus')" ... />
<AButton ...>{{ t('orderDetail.apply') }}</AButton>
<ATextarea :label="t('orderDetail.noteToCustomer')" :placeholder="t('orderDetail.notePlaceholder')" ... />
<AButton ...>{{ t('orderDetail.saveNote') }}</AButton>

<!-- Also add rtl:text-right to th elements that use text-left -->
<!-- Also add rtl:text-right to text-right elements: use rtl:text-left -->
<th class="px-5 py-3 text-dash-faint font-medium text-right rtl:text-left">{{ t('orderDetail.colPrice') }}</th>
```

Also replace the `items` count span. The current code uses a JS ternary for pluralization:
```vue
<!-- Replace: -->
{{ order.items?.length ?? order.itemCount }} item{{ ... !== 1 ? 's' : '' }}
<!-- With: -->
{{ t('orderDetail.itemCount', { n: order.items?.length ?? order.itemCount }) }}
```

Not found: `'Order not found.'` — replace with `t('orderDetail.notFound')`.

- [x] **Step 3: Commit**

```bash
git add aroma-admin/src/views/OrdersView.vue \
        aroma-admin/src/views/OrderDetailView.vue
git commit -m "feat: translate OrdersView and OrderDetailView"
```

---

## Task 9: Translate ProductsView

**Files:**
- Modify: `aroma-admin/src/views/ProductsView.vue`

- [x] **Step 1: Update `ProductsView.vue`**

Add `useI18n` and make filter options and column definitions computed:

```ts
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const typeOptions = computed(() =>
  ['EDP','EDT','Parfum','EDC'].map(v => ({ value: v, label: v }))
)
const typeFilterOptions = computed(() => [
  { value: '', label: t('products.allTypes') },
  ...typeOptions.value,
])
const brandOptionsWithAll = computed(() => [
  { value: '', label: t('products.allBrands') },
  ...brands.value.map(b => ({ value: String(b.id), label: b.name })),
])
const categoryOptionsWithAll = computed(() => [
  { value: '', label: t('products.allCategories') },
  ...cats.value.map(c => ({ value: String(c.id), label: c.label })),
])

const cols = computed(() => [
  { key: 'name',         label: t('products.colName') },
  { key: 'brand',        label: t('products.colBrand') },
  { key: 'category',     label: t('products.colCategory') },
  { key: 'type',         label: t('products.colType') },
  { key: 'price',        label: t('products.colPrice') },
  { key: 'isNew',        label: t('products.colFlags') },
  { key: 'variantCount', label: t('products.colVariants') },
])

const flags = computed(() => [
  { key: 'is_new'        as const, label: t('products.flagNewArrival') },
  { key: 'is_bestseller' as const, label: t('products.flagBestseller') },
  { key: 'is_offer'      as const, label: t('products.flagOffer') },
])
```

Update filter select `:options` references to use `brandOptionsWithAll` and `categoryOptionsWithAll` (instead of the inline spread with hardcoded strings).

Key template string replacements:

```vue
<!-- Toolbar -->
<AInput :label="t('products.labelName')" :placeholder="t('products.searchPlaceholder')" ... />
<ASelect :label="t('products.labelBrand')" :options="brandOptionsWithAll" ... />
<ASelect :label="t('products.labelCategory')" :options="categoryOptionsWithAll" ... />
<AButton ...><Plus :size="14" /> {{ t('products.addProduct') }}</AButton>
<ASelect :label="t('products.labelType')" :options="typeFilterOptions" ... />
<AInput :label="t('products.labelPriceMin')" ... />
<AInput :label="t('products.labelPriceMax')" ... />

<!-- Table cells -->
<span v-else class="text-dash-faint">{{ t('common.noVariants') }}</span>
<span v-if="value" ...>{{ t('products.flagNew') }}</span>

<!-- Action buttons -->
<AButton ...>{{ t('products.variantsCount', { count: (row as AdminProduct).variantCount }) }}</AButton>
<AButton ...>{{ t('common.edit') }}</AButton>
<AButton ...>{{ t('common.delete') }}</AButton>

<!-- Empty state -->
<AEmptyState :icon="Package" :heading="t('products.noProducts')" :sub="t('products.noProductsSub')">
  <template #action><AButton ...><Plus :size="14" /> {{ t('products.addProduct') }}</AButton></template>
</AEmptyState>

<!-- Modal -->
<AModal :title="editing ? t('products.modalEditTitle') : t('products.modalAddTitle')" ...>
<AInput :label="t('products.labelNameAr')" ... />
<AInput :label="t('products.labelNameEn')" ... />
<AInput :label="t('products.labelSlug')" ... />
<ASelect :label="t('products.labelBrand')" :placeholder="t('products.chooseBrand')" ... />
<ASelect :label="t('products.labelCategory')" :placeholder="t('products.chooseCategory')" ... />
<ASelect :label="t('products.labelType')" :placeholder="t('products.chooseType')" ... />
<ATextarea :label="t('products.labelDescription')" ... />
<AInput :label="t('products.labelPlaceholderBg')" ... />
<AInput :label="t('products.labelPlaceholderDot')" ... />
<!-- flag labels use flags computed above -->
<AButton ...>{{ t('common.cancel') }}</AButton>
<AButton ...>{{ editing ? t('common.saveChanges') : t('products.addProduct') }}</AButton>

<!-- Confirm dialog -->
<AConfirmDialog :title="t('products.deleteTitle')" :message="t('common.confirmDelete', { name: deletingProduct?.name })" ... />
```

Replace validation error strings in `handleSave`:

```ts
if (!form.value.name)        { formErrors.value.name        = t('products.nameRequired'); return }
if (!form.value.slug && !editing.value) { formErrors.value.slug = t('products.slugRequired'); return }
if (!form.value.brand_id)    { formErrors.value.brand_id    = t('products.brandRequired'); return }
if (!form.value.category_id) { formErrors.value.category_id = t('products.categoryRequired'); return }
if (!form.value.type)        { formErrors.value.type        = t('products.typeRequired'); return }
// on catch:
formErrors.value.general = e instanceof Error ? e.message : t('common.saveFailed')
// on delete catch:
formErrors.value.general = e instanceof Error ? e.message : t('common.deleteFailed')
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/views/ProductsView.vue
git commit -m "feat: translate ProductsView"
```

---

## Task 10: Translate ProductCreateView

**Files:**
- Modify: `aroma-admin/src/views/ProductCreateView.vue`

- [x] **Step 1: Add `useI18n` and translate computed flags**

In `<script setup>`:

```ts
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const flags = computed(() => [
  { key: 'is_new'        as const, label: t('productCreate.flagNewArrival'),  hint: t('productCreate.flagNewArrivalHint') },
  { key: 'is_bestseller' as const, label: t('productCreate.flagBestseller'),  hint: t('productCreate.flagBestsellerHint') },
  { key: 'is_offer'      as const, label: t('productCreate.flagOffer'),        hint: t('productCreate.flagOfferHint') },
])

const typeOptions = computed(() =>
  ['EDP','EDT','Parfum','EDC'].map(v => ({ value: v, label: v }))
)
```

Replace validation strings in `handleSave`:

```ts
if (!form.value.name)        { formErrors.value.name        = t('productCreate.nameRequired'); return }
if (!form.value.brand_id)    { formErrors.value.brand_id    = t('productCreate.brandRequired'); return }
if (!form.value.category_id) { formErrors.value.category_id = t('productCreate.categoryRequired'); return }
if (!form.value.type)        { formErrors.value.type        = t('productCreate.typeRequired'); return }
```

- [x] **Step 2: Replace template strings**

```vue
<!-- Sticky header -->
<p ...>{{ t('productCreate.breadcrumb') }}</p>
<h1 ...>{{ t('productCreate.title') }}</h1>
<AButton variant="secondary" ...>{{ t('common.cancel') }}</AButton>
<AButton ...><Save :size="13" />{{ t('productCreate.saveProduct') }}</AButton>

<!-- Names section -->
<h2 ...>{{ t('productCreate.sectionName') }}</h2>
<AInput :label="t('productCreate.labelNameAr')" :placeholder="t('productCreate.placeholderNameAr')" ... />
<p ...>{{ t('productCreate.hintNameAr') }}</p>
<AInput :label="t('productCreate.labelNameEn')" :placeholder="t('productCreate.placeholderNameEn')" ... />
<p ...>{{ t('productCreate.hintNameEn') }}</p>
<span ...>{{ t('productCreate.slugPrefix') }}</span>
<span ...>{{ t('productCreate.slugAuto') }}</span>
<span ...>{{ t('productCreate.slugHint') }}</span>

<!-- Description -->
<h2 ...>{{ t('productCreate.sectionDescription') }}</h2>
<ATextarea :placeholder="t('productCreate.placeholderDescription')" ... />

<!-- Images -->
<h2 ...>{{ t('productCreate.sectionImages') }}</h2>
<p ...>{{ t('productCreate.imagesHint') }}</p>
<span ...>{{ t('productCreate.addImages') }}</span>
<p ...>{{ t('productCreate.dropHint') }}</p>

<!-- Organize -->
<h2 ...>{{ t('productCreate.sectionOrganize') }}</h2>
<ASelect :label="t('productCreate.labelBrand')" :placeholder="t('productCreate.chooseBrand')" ... />
<ASelect :label="t('productCreate.labelCategory')" :placeholder="t('productCreate.chooseCategory')" ... />
<ASelect :label="t('productCreate.labelType')" :placeholder="t('productCreate.chooseType')" ... />

<!-- Status -->
<h2 ...>{{ t('productCreate.sectionStatus') }}</h2>

<!-- Card color -->
<h2 ...>{{ t('productCreate.sectionCardColor') }}</h2>
<p ...>{{ t('productCreate.labelBg') }}</p>
<p ...>{{ t('productCreate.labelAccent') }}</p>
<span ...>{{ t('productCreate.preview') }}</span>
```

- [x] **Step 3: Commit**

```bash
git add aroma-admin/src/views/ProductCreateView.vue
git commit -m "feat: translate ProductCreateView"
```

---

## Task 11: Translate ProductVariantsView

**Files:**
- Modify: `aroma-admin/src/views/ProductVariantsView.vue`

- [x] **Step 1: Add `useI18n` to script**

```ts
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
```

- [x] **Step 2: Replace template strings**

Key replacements — read the full file and replace every hardcoded user-visible string:

```vue
<!-- Breadcrumb -->
<RouterLink to="/products" ...>{{ t('productVariants.breadcrumb') }}</RouterLink>
<span ...>{{ t('productVariants.title') }}</span>

<!-- Images card -->
<h2 ...>{{ t('productVariants.sectionImages') }}</h2>
<p ...>{{ imagesExpanded ? t('productVariants.imagesExpanded') : t('productVariants.imagesCollapsed', { n: images.length }) }}</p>
<span ...>{{ t('productVariants.upload') }}</span>
<AButton ...>{{ imagesExpanded ? t('productVariants.collapse') : t('productVariants.manage') }}</AButton>
<div ...>{{ t('productVariants.thumbnail') }}</div>
<p ...>{{ t('productVariants.noImages') }}</p>
<p ...>{{ t('productVariants.noImagesSub') }}</p>

<!-- Step indicators -->
<!-- Step 1 -->
<span v-if="currentStep > 1 && productType === 'single'">{{ t('productVariants.typeSingle') }}</span>
<span v-else-if="currentStep > 1 && productType === 'multi'">{{ t('productVariants.typeMulti') }}</span>
<span v-else>{{ t('productVariants.step1Label') }}</span>
<!-- Step 2 -->
<span v-if="currentStep > 2">{{ t('productVariants.step2Done', { n: combinationCount }) }}</span>
<span v-else>{{ t('productVariants.step2Label') }}</span>
<!-- Step 3 -->
<span>{{ t('productVariants.step3Label') }}</span>

<!-- Step 1 content -->
<h2 ...>{{ t('productVariants.step1Title') }}</h2>
<p ...>{{ t('productVariants.step1Sub') }}</p>
<!-- radio labels -->
<p ...>{{ t('productVariants.typeSingle') }}</p>
<p ...>{{ t('productVariants.typeSingleDesc') }}</p>
<p ...>{{ t('productVariants.typeMulti') }}</p>
<p ...>{{ t('productVariants.typeMultiDesc') }}</p>
<AButton ...>{{ t('productVariants.next') }}</AButton>

<!-- Step 2 content -->
<h2 ...>{{ t('productVariants.step2Title') }}</h2>
<AButton ...>{{ t('productVariants.addSpec') }}</AButton>
<AButton ...>{{ t('productVariants.back') }}</AButton>
<AButton ...>{{ t('productVariants.next') }}</AButton>

<!-- Step 3 / edit grid -->
<h2 ...>{{ t('productVariants.step3Title') }}</h2>
<!-- or when editing: -->
<h2 ...>{{ t('productVariants.editTitle') }}</h2>
<AButton ...>{{ t('productVariants.saveVariants') }}</AButton>
<!-- grid column headers -->
<th ...>{{ t('productVariants.colVariant') }}</th>
<th ...>{{ t('productVariants.colPrice') }}</th>
<th ...>{{ t('productVariants.colStock') }}</th>
<!-- stock toggle labels -->
<span ...>{{ t('productVariants.inStock') }}</span>
<span ...>{{ t('productVariants.outOfStock') }}</span>
<AButton ...>{{ t('productVariants.addVariant') }}</AButton>

<!-- No variants empty state -->
<p ...>{{ t('productVariants.noVariantsYet') }}</p>
<p ...>{{ t('productVariants.noVariantsYetSub') }}</p>
```

- [x] **Step 3: Commit**

```bash
git add aroma-admin/src/views/ProductVariantsView.vue
git commit -m "feat: translate ProductVariantsView"
```

---

## Task 12: Translate BrandsView and BrandDetailView

**Files:**
- Modify: `aroma-admin/src/views/BrandsView.vue`
- Modify: `aroma-admin/src/views/BrandDetailView.vue`

- [x] **Step 1: Update `BrandsView.vue`**

Add `useI18n` and make `cols` computed:

```ts
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const cols = computed(() => [
  { key: 'id',           label: t('brands.colId') },
  { key: 'name',         label: t('brands.colName') },
  { key: 'origin',       label: t('brands.colOrigin') },
  { key: 'tagline',      label: t('brands.colTagline') },
  { key: 'productCount', label: t('brands.colProducts') },
])
```

Replace validation strings:

```ts
if (!form.value.name) { formErrors.value.name = t('brands.nameRequired'); return }
if (!form.value.bg)   { formErrors.value.bg   = t('brands.colourRequired'); return }
if (!editing.value && !generatedSlug.value) {
  formErrors.value.name_en = t('brands.englishRequired'); return
}
// on catch:
formErrors.value.general = e instanceof Error ? e.message : t('common.saveFailed')
deleteError.value = e instanceof Error ? e.message : t('common.deleteFailed')
```

Key template replacements:

```vue
<AButton ...><Plus :size="14" /> {{ t('brands.addBrand') }}</AButton>
<AInput :label="t('brands.labelName')" :placeholder="t('brands.searchPlaceholder')" ... />
<AInput :label="t('brands.labelOrigin')" :placeholder="t('brands.originPlaceholder')" ... />
<AInput :label="t('brands.labelTagline')" :placeholder="t('brands.taglinePlaceholder')" ... />
<AInput :label="t('brands.labelMinProducts')" ... />
<AInput :label="t('brands.labelMaxProducts')" ... />
<AEmptyState :icon="Tag" :heading="t('brands.noBrands')" />
<AModal :title="editing ? t('brands.modalEditTitle') : t('brands.modalAddTitle')" ...>
<AInput :label="t('brands.labelNameAr')" ... />
<AInput :label="t('brands.labelNameEn')" ... />
<span ...>{{ t('brands.brandIdLabel') }}</span>
<span ...>{{ t('brands.brandIdHint') }}</span>
<AInput :label="t('brands.labelOriginField')" ... />
<AInput :label="t('brands.labelBg')" ... />
<p ...>{{ t('brands.logoSection') }}</p>
<label ...>{{ t('brands.logoUpload') }}</label>
<AButton ...><X :size="12" /> {{ t('brands.logoRemove') }}</AButton>
<AButton ...>{{ t('common.cancel') }}</AButton>
<AButton ...>{{ editing ? t('brands.save') : t('brands.add') }}</AButton>
<AConfirmDialog
  :title="t('brands.deleteTitle')"
  :message="deletingBrand?.productCount
    ? t('brands.deleteWithProducts', { count: deletingBrand.productCount })
    : t('common.confirmDelete', { name: deletingBrand?.name })"
  ... />
```

- [x] **Step 2: Update `BrandDetailView.vue`**

Add `useI18n` and make `cols` and filter computed:

```ts
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const typeFilterOptions = computed(() => [
  { value: '', label: t('brandDetail.allTypes') },
  ...['EDP','EDT','Parfum','EDC'].map(v => ({ value: v, label: v })),
])
const categoryOptions = computed(() => [
  { value: '', label: t('brandDetail.allCategories') },
  ...cats.value.map(c => ({ value: String(c.id), label: c.label })),
])

const cols = computed(() => [
  { key: 'name',         label: t('brandDetail.colName') },
  { key: 'category',     label: t('brandDetail.colCategory') },
  { key: 'type',         label: t('brandDetail.colType') },
  { key: 'price',        label: t('brandDetail.colPrice') },
  { key: 'isNew',        label: t('brandDetail.colFlags') },
  { key: 'variantCount', label: t('brandDetail.colVariants') },
])

const flags = computed(() => [
  { key: 'is_new'        as const, label: t('products.flagNewArrival') },
  { key: 'is_bestseller' as const, label: t('products.flagBestseller') },
  { key: 'is_offer'      as const, label: t('products.flagOffer') },
])
```

Key template replacements (back link, field labels, section headers, modal content, action buttons — follow same pattern as BrandsView).

- [x] **Step 3: Commit**

```bash
git add aroma-admin/src/views/BrandsView.vue \
        aroma-admin/src/views/BrandDetailView.vue
git commit -m "feat: translate BrandsView and BrandDetailView"
```

---

## Task 13: Translate CategoriesView

**Files:**
- Modify: `aroma-admin/src/views/CategoriesView.vue`

- [x] **Step 1: Update `CategoriesView.vue`**

```ts
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const cols = computed(() => [
  { key: 'id',           label: t('categories.colId') },
  { key: 'label',        label: t('categories.colLabel') },
  { key: 'productCount', label: t('categories.colProducts') },
])
```

Replace validation strings:

```ts
if (!form.value.label) { formErrors.value.label = t('categories.labelRequired'); return }
if (!form.value.bg)    { formErrors.value.bg    = t('categories.colourRequired'); return }
formErrors.value.general = e instanceof Error ? e.message : t('common.saveFailed')
deleteError.value = e instanceof Error ? e.message : t('common.deleteFailed')
```

Key template replacements:

```vue
<AButton ...><Plus :size="14" /> {{ t('categories.addCategory') }}</AButton>
<AInput :label="t('categories.labelLabel')" :placeholder="t('categories.searchPlaceholder')" ... />
<AInput :label="t('categories.labelMinProducts')" ... />
<AInput :label="t('categories.labelMaxProducts')" ... />
<AEmptyState :icon="Grid3X3" :heading="t('categories.noCategories')" />
<AModal :title="editing ? t('categories.modalEditTitle') : t('categories.modalAddTitle')" ...>
<AInput :label="t('categories.labelLabel')" ... />
<AInput :label="t('categories.labelBg')" ... />
<AButton ...>{{ t('common.cancel') }}</AButton>
<AButton ...>{{ editing ? t('categories.save') : t('categories.add') }}</AButton>
<AConfirmDialog
  :title="t('categories.deleteTitle')"
  :message="t('categories.deleteMsg', { name: deletingCat?.label })"
  ... />
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/views/CategoriesView.vue
git commit -m "feat: translate CategoriesView"
```

---

## Task 14: Translate UsersView and UserDetailView

**Files:**
- Modify: `aroma-admin/src/views/UsersView.vue`
- Modify: `aroma-admin/src/views/UserDetailView.vue`

- [x] **Step 1: Update `UsersView.vue`**

```ts
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const cols = computed(() => [
  { key: 'name',       label: t('users.colName') },
  { key: 'email',      label: t('users.colEmail') },
  { key: 'phone',      label: t('users.colPhone') },
  { key: 'orderCount', label: t('users.colOrders') },
  { key: 'joinedAt',   label: t('users.colJoined') },
])
```

Template:

```vue
<AInput :placeholder="t('users.searchPlaceholder')" ... />
<!-- order count suffix -->
<span class="text-dash-faint text-[10px] ml-1">{{ t('users.orders') }}</span>
<RouterLink ...>{{ t('common.view') }}</RouterLink>
<AEmptyState :icon="Users" :heading="t('users.noUsers')" :sub="t('users.noUsersSub')" />
```

- [x] **Step 2: Update `UserDetailView.vue`**

```ts
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
```

Template:

```vue
<RouterLink to="/users" ...>{{ t('userDetail.breadcrumb') }}</RouterLink>
<span ...>{{ t('userDetail.userLabel') }}{{ id }}</span>
<!-- Tabs -->
<button ...>{{ tab === 'cart' ? t('userDetail.tabCart') : t('userDetail.tabWishlist') }}</button>
<!-- Empty states -->
<div ...>{{ t('userDetail.cartEmpty') }}</div>
<div ...>{{ t('userDetail.wishlistEmpty') }}</div>
<!-- Qty label -->
<p ...>{{ t('userDetail.qty', { n: item.quantity }) }}</p>
```

- [x] **Step 3: Commit**

```bash
git add aroma-admin/src/views/UsersView.vue \
        aroma-admin/src/views/UserDetailView.vue
git commit -m "feat: translate UsersView and UserDetailView"
```

---

## Task 15: Translate CouponsView

**Files:**
- Modify: `aroma-admin/src/views/CouponsView.vue`

- [x] **Step 1: Update `CouponsView.vue`**

```ts
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const cols = computed(() => [
  { key: 'code',           label: t('coupons.colCode') },
  { key: 'type',           label: t('coupons.colType') },
  { key: 'value',          label: t('coupons.colValue') },
  { key: 'minOrderAmount', label: t('coupons.colMinOrder') },
  { key: 'uses',           label: t('coupons.colUses') },
  { key: 'expiresAt',      label: t('coupons.colExpires') },
  { key: 'isActive',       label: t('coupons.colStatus') },
])
```

Key template replacements:

```vue
<AInput :placeholder="t('coupons.searchPlaceholder')" ... />
<AButton ...><Plus :size="14" /> {{ t('coupons.newCoupon') }}</AButton>
<span ...>{{ (row as AdminCoupon).type === 'percentage' ? t('coupons.typePercentage') : t('coupons.typeFixed') }}</span>
<span ...>{{ value ? t('common.never') : value.slice(0,10) }}</span>  <!-- expires -->
<span ...>{{ value ? t('coupons.statusActive') : t('coupons.statusInactive') }}</span>
<AButton ...>{{ t('common.edit') }}</AButton>
<AButton ...>{{ (row as AdminCoupon).isActive ? t('common.disable') : t('common.enable') }}</AButton>
<AButton ...>{{ t('common.delete') }}</AButton>
<AEmptyState :icon="Ticket" :heading="t('coupons.noCoupons')" />

<!-- Modal -->
<AModal :title="editing ? t('coupons.modalEditTitle') : t('coupons.modalAddTitle')" ...>
<AInput :label="t('coupons.labelCode')" ... />
<label ...>{{ t('coupons.labelType') }}</label>
<option value="percentage">{{ t('coupons.optionPercentage') }}</option>
<option value="fixed">{{ t('coupons.optionFixed') }}</option>
<AInput :label="form.type === 'percentage' ? t('coupons.labelValue') : t('coupons.labelValueFixed')" ... />
<AInput :label="t('coupons.labelMinOrder')" ... />
<AInput :label="t('coupons.labelMaxUses')" ... />
<AInput :label="t('coupons.labelExpiresAt')" ... />
<span ...>{{ t('coupons.labelActive') }}</span>
<AButton ...>{{ t('common.cancel') }}</AButton>
<AButton ...>{{ editing ? t('coupons.save') : t('coupons.create') }}</AButton>

<AConfirmDialog :title="t('coupons.deleteTitle')" :message="t('common.confirmDelete', { name: deletingCoupon?.code })" ... />
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/views/CouponsView.vue
git commit -m "feat: translate CouponsView"
```

---

## Task 16: Translate SpecTypesView

**Files:**
- Modify: `aroma-admin/src/views/SpecTypesView.vue`

- [x] **Step 1: Update `SpecTypesView.vue`**

```ts
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const cols = computed(() => [
  { key: 'name',         label: t('specTypes.colName') },
  { key: 'unit',         label: t('specTypes.colUnit') },
  { key: 'productCount', label: t('specTypes.colInUse') },
])
```

Replace validation:

```ts
if (!form.value.name.trim()) {
  formErrors.value.name = t('specTypes.nameRequired')
  return
}
loadError.value = (e as any)?.response?.data?.message ?? t('common.saveFailed')
loadError.value = (e as any)?.response?.data?.message ?? t('common.deleteFailed')
```

Key template replacements:

```vue
<h1 ...>{{ t('specTypes.title') }}</h1>
<p ...>{{ t('specTypes.subtitle') }}</p>
<AButton ...><Plus :size="14" /> {{ t('specTypes.newSpecType') }}</AButton>
<!-- unit column cell -->
<span ...>{{ value ?? '—' }}</span>
<!-- productCount cell -->
<span ...>{{ t('specTypes.inUseSuffix', { n: value }, value) }}</span>
<!-- Disable delete if in use -->
<AButton :title="(row as SpecType).productCount > 0 ? t('common.inUse') : ''" ...>{{ t('common.delete') }}</AButton>
<AButton ...>{{ t('common.edit') }}</AButton>
<AEmptyState :icon="SlidersHorizontal" :heading="t('specTypes.noSpecTypes')" :sub="t('specTypes.noSpecTypesSub')" />

<!-- Modal -->
<AModal :title="editing ? t('specTypes.modalEditTitle') : t('specTypes.modalAddTitle')" ...>
<AInput :label="t('specTypes.labelName')" :placeholder="t('specTypes.namePlaceholder')" ... />
<AInput :label="t('specTypes.labelUnit')" :placeholder="t('specTypes.unitPlaceholder')" ... />
<p ...>{{ t('specTypes.unitHint') }}</p>
<AButton ...>{{ t('common.cancel') }}</AButton>
<AButton ...>{{ editing ? t('specTypes.save') : t('specTypes.create') }}</AButton>

<AConfirmDialog :title="t('specTypes.deleteTitle')" :message="t('specTypes.deleteMsg')" ... />
```

- [x] **Step 2: Commit**

```bash
git add aroma-admin/src/views/SpecTypesView.vue
git commit -m "feat: translate SpecTypesView"
```

---

## Task 17: Final verification

- [x] **Step 1: Build to check for TypeScript errors**

```bash
cd aroma-admin && npm run build 2>&1
```

Expected: Exits 0, no TypeScript errors. Fix any type errors before proceeding.

- [x] **Step 2: Full EN→AR→EN cycle test**

```bash
npm run dev
```

Walk through each page in both locales and verify:
- [x] Login page: Arabic text renders, layout is RTL
- [x] Dashboard: greeting in Arabic, date in Arabic, stat card labels translated
- [x] Orders: status pills translated, table columns translated, pickup/delivery badges translated
- [x] Order detail: all section headers, field labels, action panel in Arabic
- [x] Products: filters, table, modals fully translated
- [x] Product create: all sections translated
- [x] Product variants: wizard steps, image section translated
- [x] Brands: filters, table, modal translated
- [x] Brand detail: header fields, product table translated
- [x] Categories: table, modal translated
- [x] Customers: search, table translated
- [x] Customer detail: tabs, empty states translated
- [x] Coupons: table, modal, type/status labels translated
- [x] Spec types: header, table, modal translated
- [x] Sidebar: all nav labels in Arabic in RTL; in LTR shows English
- [x] Pagination: "صفحة X من Y" in Arabic

- [x] **Step 3: Refresh persistence check**

1. Switch to Arabic
2. Refresh the page
3. Verify: still Arabic, RTL, Cairo font

- [x] **Step 4: Final commit**

```bash
git add -p  # stage any remaining unstaged changes
git commit -m "feat: complete Arabic i18n — all views translated"
```
