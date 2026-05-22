<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\{
    AuthController, ProductController, BrandController, CategoryController,
    OrderController, AddressController, CartController, WishlistController, HomeController,
    CouponController
};

Route::get('/health', fn() => response()->json(['status' => 'ok']));

// Public routes
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::get('/home', [HomeController::class, 'index']);
Route::get('/brands', [BrandController::class, 'index']);
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{slug}', [ProductController::class, 'show']);
Route::get('/products/{id}/similar', [ProductController::class, 'similar']);

// Protected routes (require auth:sanctum)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);
    Route::patch('/user', [AuthController::class, 'update']);
    Route::patch('/user/password', [AuthController::class, 'changePassword']);

    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders/{id}', [OrderController::class, 'show']);
    Route::patch('/orders/{id}/cancel', [OrderController::class, 'cancel']);

    Route::get('/addresses', [AddressController::class, 'index']);
    Route::post('/addresses', [AddressController::class, 'store']);
    Route::put('/addresses/{address}', [AddressController::class, 'update']);
    Route::delete('/addresses/{address}', [AddressController::class, 'destroy']);

    Route::get('/cart', [CartController::class, 'index']);
    Route::post('/cart', [CartController::class, 'store']);
    Route::patch('/cart/{cartItem}', [CartController::class, 'update']);
    Route::delete('/cart/{cartItem}', [CartController::class, 'destroy']);

    Route::get('/wishlist', [WishlistController::class, 'index']);
    Route::post('/wishlist', [WishlistController::class, 'store']);
    Route::delete('/wishlist/{productId}', [WishlistController::class, 'destroy']);

    Route::post('/coupons/validate', [CouponController::class, 'validate']);
});

use App\Http\Controllers\Api\Admin\{
    AdminDashboardController, AdminOrderController, AdminProductController,
    AdminBrandController, AdminCategoryController, AdminUserController,
    AdminProductVariantController, AdminProductImageController,
    AdminUserDetailController, AdminCouponController, AdminSpecTypeController,
    AdminProductSpecController, AdminProductVariantGenerateController,
    AdminProductDiscountController, AdminAdminsController, AdminRolesController,
};

Route::middleware(['auth:sanctum', 'is_admin'])->prefix('admin')->group(function () {
    Route::get('/stats', [AdminDashboardController::class, 'stats']);

    Route::get('/orders', [AdminOrderController::class, 'index']);
    Route::get('/orders/{id}', [AdminOrderController::class, 'show']);
    Route::patch('/orders/{id}/status', [AdminOrderController::class, 'updateStatus']);
    Route::patch('/orders/{id}/note', [AdminOrderController::class, 'addAdminNote']);

    Route::get('/products', [AdminProductController::class, 'index']);
    Route::post('/products', [AdminProductController::class, 'store']);
    Route::put('/products/{id}', [AdminProductController::class, 'update']);
    Route::delete('/products/{id}', [AdminProductController::class, 'destroy']);

    Route::get('/products/{productId}/variants',                [AdminProductVariantController::class, 'index']);
    Route::post('/products/{productId}/variants',               [AdminProductVariantController::class, 'store']);
    Route::put('/products/{productId}/variants/bulk',            [AdminProductVariantController::class, 'bulkUpdate']);
    Route::put('/products/{productId}/variants/{variantId}',    [AdminProductVariantController::class, 'update']);
    Route::delete('/products/{productId}/variants/{variantId}', [AdminProductVariantController::class, 'destroy']);
    Route::patch('/products/{productId}/variants/{variantId}/default', [AdminProductVariantController::class, 'setDefault']);

    Route::get('/products/{productId}/images',                        [AdminProductImageController::class, 'index']);
    Route::post('/products/{productId}/images',                       [AdminProductImageController::class, 'store']);
    Route::patch('/products/{productId}/images/{imageId}/thumbnail',  [AdminProductImageController::class, 'setThumbnail']);
    Route::delete('/products/{productId}/images/{imageId}',           [AdminProductImageController::class, 'destroy']);

    Route::get('/products/{productId}/discounts',                       [AdminProductDiscountController::class, 'index']);
    Route::post('/products/{productId}/discounts',                      [AdminProductDiscountController::class, 'store']);
    Route::delete('/products/{productId}/discounts/{discountId}',       [AdminProductDiscountController::class, 'destroy']);
    Route::patch('/products/{productId}/discounts/{discountId}/toggle', [AdminProductDiscountController::class, 'toggle']);

    Route::get('/brands', [AdminBrandController::class, 'index']);
    Route::post('/brands', [AdminBrandController::class, 'store']);
    Route::get('/brands/{id}', [AdminBrandController::class, 'show']);
    Route::put('/brands/{id}', [AdminBrandController::class, 'update']);
    Route::delete('/brands/{id}', [AdminBrandController::class, 'destroy']);
    Route::post('/brands/{id}/logo', [AdminBrandController::class, 'uploadLogo']);
    Route::delete('/brands/{id}/logo', [AdminBrandController::class, 'destroyLogo']);

    Route::get('/categories', [AdminCategoryController::class, 'index']);
    Route::post('/categories', [AdminCategoryController::class, 'store']);
    Route::put('/categories/{id}', [AdminCategoryController::class, 'update']);
    Route::delete('/categories/{id}', [AdminCategoryController::class, 'destroy']);

    Route::get('/users',              [AdminUserController::class, 'index']);
    Route::get('/users/{id}',         [AdminUserController::class, 'show']);
    Route::get('/users/{id}/orders',   [AdminUserDetailController::class, 'orders']);
    Route::get('/users/{id}/cart',     [AdminUserDetailController::class, 'cart']);
    Route::get('/users/{id}/wishlist', [AdminUserDetailController::class, 'wishlist']);

    Route::get('/coupons',                       [AdminCouponController::class, 'index']);
    Route::post('/coupons',                      [AdminCouponController::class, 'store']);
    Route::put('/coupons/{id}',                  [AdminCouponController::class, 'update']);
    Route::delete('/coupons/{id}',               [AdminCouponController::class, 'destroy']);
    Route::patch('/coupons/{id}/toggle',         [AdminCouponController::class, 'toggle']);
    Route::get('/coupons/{id}/orders',           [AdminCouponController::class, 'orders']);

    Route::get('/spec-types',         [AdminSpecTypeController::class, 'index']);
    Route::post('/spec-types',        [AdminSpecTypeController::class, 'store']);
    Route::put('/spec-types/{id}',    [AdminSpecTypeController::class, 'update']);
    Route::delete('/spec-types/{id}', [AdminSpecTypeController::class, 'destroy']);

    Route::get('/products/{productId}/specs',  [AdminProductSpecController::class, 'show']);
    Route::put('/products/{productId}/specs',  [AdminProductSpecController::class, 'update']);
    Route::post('/products/{productId}/variants/generate', AdminProductVariantGenerateController::class);

    Route::get('/admins',                         [AdminAdminsController::class, 'index']);
    Route::post('/admins',                        [AdminAdminsController::class, 'store']);
    Route::put('/admins/{id}',                    [AdminAdminsController::class, 'update']);
    Route::patch('/admins/{id}/reset-password',   [AdminAdminsController::class, 'resetPassword']);
    Route::patch('/admins/{id}/toggle-status',    [AdminAdminsController::class, 'toggleStatus']);

    Route::get('/roles',           [AdminRolesController::class, 'index']);
    Route::post('/roles',          [AdminRolesController::class, 'store']);
    Route::put('/roles/{slug}',    [AdminRolesController::class, 'update']);
    Route::delete('/roles/{slug}', [AdminRolesController::class, 'destroy']);
});
