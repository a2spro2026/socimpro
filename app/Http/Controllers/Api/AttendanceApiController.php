<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AttendanceApiController extends Controller
{
    public function index(Request $request)
    {
        $month = $request->input('month', now()->format('Y-m'));
        try {
            $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        } catch (\Throwable) {
            $start = now()->startOfMonth();
            $month = $start->format('Y-m');
        }
        $end = $start->copy()->endOfMonth();
        $daysInMonth = $start->daysInMonth;

        $employees = Employee::query()
            ->when($request->filled('name'), function ($q) use ($request) {
                $name = trim((string) $request->name);
                $q->where(function ($qq) use ($name) {
                    $qq->where('first_name', 'like', "%{$name}%")
                        ->orWhere('last_name', 'like', "%{$name}%")
                        ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$name}%"]);
                });
            })
            ->where('status', 'actif')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        $attendances = Attendance::query()
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->whereIn('employee_id', $employees->pluck('id'))
            ->get()
            ->groupBy('employee_id');

        $etatFilter = $request->input('etat'); // present|absent

        $rows = $employees->map(function (Employee $e) use ($attendances, $daysInMonth, $start, $etatFilter) {
            $byDay = [];
            for ($d = 1; $d <= $daysInMonth; $d++) {
                $byDay[$d] = null;
            }
            foreach ($attendances->get($e->id, collect()) as $att) {
                $day = (int) Carbon::parse($att->date)->format('j');
                $byDay[$day] = $att->status === 'present' ? 'P' : ($att->status === 'absent' ? 'A' : strtoupper(substr($att->status, 0, 1)));
            }

            if ($etatFilter === 'present' && ! in_array('P', $byDay, true)) {
                return null;
            }
            if ($etatFilter === 'absent' && ! in_array('A', $byDay, true)) {
                return null;
            }

            return [
                'id' => $e->id,
                'date' => $start->format('m/Y'),
                'matricule' => $e->matricule,
                'full_name' => $e->full_name,
                'position' => $e->position,
                'days' => $byDay,
                'present_count' => count(array_filter($byDay, fn ($v) => $v === 'P')),
                'absent_count' => count(array_filter($byDay, fn ($v) => $v === 'A')),
            ];
        })->filter()->values();

        return response()->json([
            'month' => $month,
            'days_in_month' => $daysInMonth,
            'data' => $rows,
        ]);
    }

    public function saveMonth(Request $request)
    {
        $validated = $request->validate([
            'month' => 'required|date_format:Y-m',
            'employee_id' => 'required|exists:employees,id',
            'days' => 'required|array',
            'days.*' => 'nullable|in:P,A',
        ]);

        $start = Carbon::createFromFormat('Y-m', $validated['month'])->startOfMonth();
        $employeeId = (int) $validated['employee_id'];

        DB::transaction(function () use ($validated, $start, $employeeId) {
            foreach ($validated['days'] as $day => $mark) {
                $dayNum = (int) $day;
                if ($dayNum < 1 || $dayNum > $start->daysInMonth) {
                    continue;
                }
                $date = $start->copy()->day($dayNum)->toDateString();

                if ($mark === null || $mark === '') {
                    Attendance::where('employee_id', $employeeId)->where('date', $date)->delete();
                    continue;
                }

                Attendance::updateOrCreate(
                    ['employee_id' => $employeeId, 'date' => $date],
                    [
                        'status' => $mark === 'P' ? 'present' : 'absent',
                        'chantier_id' => null,
                    ]
                );
            }
        });

        return response()->json(['message' => 'Présences enregistrées']);
    }
}
