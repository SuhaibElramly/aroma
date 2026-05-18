<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Enums\OrderStatus;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function stats()
    {
        $now       = now();
        $thisMonth = $now->copy()->startOfMonth();
        $lastMonth = $now->copy()->subMonth()->startOfMonth();
        $lastMonthEnd = $now->copy()->subMonth()->endOfMonth();

        // Period-over-period changes (this month vs last month)
        $revenueThisMonth = Order::where('status', '!=', OrderStatus::Cancelled)
            ->where('created_at', '>=', $thisMonth)->sum('total');
        $revenueLastMonth = Order::where('status', '!=', OrderStatus::Cancelled)
            ->whereBetween('created_at', [$lastMonth, $lastMonthEnd])->sum('total');

        $ordersThisMonth = Order::where('created_at', '>=', $thisMonth)->count();
        $ordersLastMonth = Order::whereBetween('created_at', [$lastMonth, $lastMonthEnd])->count();

        $usersThisMonth = User::where('is_admin', false)->where('created_at', '>=', $thisMonth)->count();
        $usersLastMonth = User::where('is_admin', false)->whereBetween('created_at', [$lastMonth, $lastMonthEnd])->count();

        // Monthly orders for the last 12 months (bar chart)
        $monthlyOrders = $this->monthlyOrderCounts();

        // Monthly revenue for the last 12 months (area chart)
        $monthlyRevenue = $this->monthlyRevenue();

        // Weekly channel breakdown — all orders are "online" (no in-store distinction yet)
        $weeklyOrders = $this->weeklyOrders();

        // Gross profit from delivered orders (actual column names: unit_price, qty, product_variant_id)
        $profitData = DB::table('order_items as oi')
            ->join('orders as o', 'oi.order_id', '=', 'o.id')
            ->join('product_variants as pv', 'oi.product_variant_id', '=', 'pv.id')
            ->where('o.status', 'delivered')
            ->selectRaw('
                SUM(oi.unit_price * oi.qty) as revenue,
                SUM(COALESCE(pv.cost_price, 0) * oi.qty) as cogs,
                SUM((oi.unit_price - COALESCE(pv.cost_price, 0)) * oi.qty) as gross_profit
            ')
            ->first();

        $revenue     = (float) ($profitData->revenue ?? 0);
        $cogs        = (float) ($profitData->cogs ?? 0);
        $grossProfit = (float) ($profitData->gross_profit ?? 0);
        $avgMargin   = $revenue > 0 ? round(($grossProfit / $revenue) * 100, 1) : 0;

        // Per-category profit breakdown (top 6 by revenue)
        $categoryBreakdown = DB::table('order_items as oi')
            ->join('orders as o', 'oi.order_id', '=', 'o.id')
            ->join('product_variants as pv', 'oi.product_variant_id', '=', 'pv.id')
            ->join('products as p', 'pv.product_id', '=', 'p.id')
            ->join('categories as c', 'p.category_id', '=', 'c.id')
            ->where('o.status', 'delivered')
            ->selectRaw('
                c.label as category,
                SUM(oi.unit_price * oi.qty) as revenue,
                SUM(COALESCE(pv.cost_price, 0) * oi.qty) as cogs,
                SUM((oi.unit_price - COALESCE(pv.cost_price, 0)) * oi.qty) as profit
            ')
            ->groupBy('c.id', 'c.label')
            ->orderByDesc('revenue')
            ->limit(6)
            ->get()
            ->map(fn($row) => [
                'category' => $row->category,
                'revenue'  => (float) $row->revenue,
                'cogs'     => (float) $row->cogs,
                'profit'   => (float) $row->profit,
                'margin'   => $row->revenue > 0 ? round(($row->profit / $row->revenue) * 100, 1) : 0,
            ]);

        return response()->json([
            'totalOrders'   => Order::count(),
            'totalRevenue'  => Order::where('status', '!=', OrderStatus::Cancelled)->sum('total'),
            'totalProducts' => Product::count(),
            'totalUsers'    => User::where('is_admin', false)->count(),

            // % changes vs last month (null when last month is 0 to avoid division by zero)
            'revenueChange' => $this->pctChange($revenueLastMonth, $revenueThisMonth),
            'ordersChange'  => $this->pctChange($ordersLastMonth, $ordersThisMonth),
            'usersChange'   => $this->pctChange($usersLastMonth, $usersThisMonth),

            // Chart data
            'monthlyOrderCounts'  => $monthlyOrders['counts'],
            'monthlyOrderLabels'  => $monthlyOrders['labels'],
            'monthlyRevenueAmounts' => $monthlyRevenue['amounts'],
            'monthlyRevenueLabels'  => $monthlyRevenue['labels'],
            'weeklyOnline'        => $weeklyOrders,
            'weeklyLabels'        => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],

            'recentOrders' => Order::with('user')
                ->orderByDesc('created_at')
                ->limit(8)
                ->get()
                ->map(fn($o) => [
                    'id'     => $o->id,
                    'user'   => $o->user?->name,
                    'total'  => $o->total,
                    'status' => $o->status?->value,
                    'date'   => $o->created_at->format('M j, Y'),
                ]),

            'grossProfit'       => $grossProfit,
            'avgMargin'         => $avgMargin,
            'cogs'              => $cogs,
            'categoryBreakdown' => $categoryBreakdown,
        ]);
    }

    private function pctChange(float|int $previous, float|int $current): int|null
    {
        if ($previous == 0) return null;
        return (int) round((($current - $previous) / $previous) * 100);
    }

    private function monthlyOrderCounts(): array
    {
        $labels = [];
        $counts = [];

        for ($i = 11; $i >= 0; $i--) {
            $month    = now()->subMonths($i);
            $labels[] = $month->format('M');
            $counts[] = Order::whereYear('created_at', $month->year)
                ->whereMonth('created_at', $month->month)
                ->count();
        }

        return ['labels' => $labels, 'counts' => $counts];
    }

    private function monthlyRevenue(): array
    {
        $labels  = [];
        $amounts = [];

        for ($i = 11; $i >= 0; $i--) {
            $month     = now()->subMonths($i);
            $labels[]  = $month->format('M');
            $amounts[] = (float) Order::where('status', '!=', OrderStatus::Cancelled)
                ->whereYear('created_at', $month->year)
                ->whereMonth('created_at', $month->month)
                ->sum('total');
        }

        return ['labels' => $labels, 'amounts' => $amounts];
    }

    private function weeklyOrders(): array
    {
        $counts = [];
        // SQLite strftime('%w'): 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
        // We want Mon(1)…Sun(0) order
        $sqliteDow = [1, 2, 3, 4, 5, 6, 0];
        foreach ($sqliteDow as $dow) {
            $counts[] = Order::whereRaw("strftime('%w', created_at) = ?", [(string) $dow])
                ->where('created_at', '>=', now()->subDays(28))
                ->count();
        }
        return $counts;
    }
}
