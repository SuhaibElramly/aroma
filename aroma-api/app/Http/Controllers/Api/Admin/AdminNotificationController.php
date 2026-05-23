<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;

class AdminNotificationController extends Controller
{
    public function index()
    {
        $notifs = AdminNotification::orderByDesc('created_at')->take(50)->get();

        return response()->json([
            'data'        => $notifs->map(fn($n) => $this->format($n)),
            'unreadCount' => AdminNotification::whereNull('read_at')->count(),
        ]);
    }

    public function markRead(int $id)
    {
        AdminNotification::findOrFail($id)->update(['read_at' => now()]);
        return response()->json(['ok' => true]);
    }

    public function markAllRead()
    {
        AdminNotification::whereNull('read_at')->update(['read_at' => now()]);
        return response()->json(['ok' => true]);
    }

    private function format(AdminNotification $n): array
    {
        return [
            'id'    => $n->id,
            'kind'  => $n->kind,
            'title' => $n->title,
            'sub'   => $n->sub,
            'time'  => $this->formatTime($n->created_at),
            'read'  => ! is_null($n->read_at),
            'data'  => $n->data,
        ];
    }

    private function formatTime(\Carbon\Carbon $time): string
    {
        $mins = (int) $time->diffInMinutes(now());
        if ($mins < 60) return $mins . 'm';
        $hours = (int) $time->diffInHours(now());
        if ($hours < 24) return $hours . 'h';
        return ((int) $time->diffInDays(now())) . 'd';
    }
}
