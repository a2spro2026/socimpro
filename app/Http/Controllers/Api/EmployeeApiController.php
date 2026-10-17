<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\Request;

class EmployeeApiController extends Controller
{
    public function index(Request $request)
    {
        $query = Employee::query()->latest();

        if ($request->filled('id')) {
            $id = trim((string) $request->id);
            $query->where(function ($q) use ($id) {
                $q->where('matricule', 'like', "%{$id}%")
                    ->orWhere('id', $id);
            });
        }

        if ($request->filled('name')) {
            $name = trim((string) $request->name);
            $query->where(function ($q) use ($name) {
                $q->where('first_name', 'like', "%{$name}%")
                    ->orWhere('last_name', 'like', "%{$name}%")
                    ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$name}%"]);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = trim((string) $request->search);
            $query->where(function ($q) use ($s) {
                $q->where('first_name', 'like', "%{$s}%")
                    ->orWhere('last_name', 'like', "%{$s}%")
                    ->orWhere('matricule', 'like', "%{$s}%");
            });
        }

        $rows = $query->paginate($request->integer('per_page', 50));

        $rows->getCollection()->transform(fn (Employee $e) => $this->format($e));

        return response()->json($rows);
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);

        if (empty($validated['matricule'])) {
            $validated['matricule'] = 'EMP-'.str_pad((string) (Employee::max('id') + 1), 5, '0', STR_PAD_LEFT);
        }

        $employee = Employee::create($validated);

        return response()->json($this->format($employee), 201);
    }

    public function show(Employee $employee)
    {
        return response()->json($this->format($employee->load(['advances', 'payments', 'assignments.chantier'])));
    }

    public function update(Request $request, Employee $employee)
    {
        $employee->update($this->validated($request, true));

        return response()->json($this->format($employee->fresh()));
    }

    public function suspend(Employee $employee)
    {
        $employee->update([
            'status' => $employee->status === 'actif' ? 'inactif' : 'actif',
        ]);

        return response()->json($this->format($employee->fresh()));
    }

    public function destroy(Employee $employee)
    {
        $employee->delete();

        return response()->json(['message' => 'Employé supprimé']);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $rules = [
            'first_name' => ($partial ? 'sometimes|' : '').'required|string|max:100',
            'last_name' => ($partial ? 'sometimes|' : '').'required|string|max:100',
            'matricule' => 'nullable|string|max:50',
            'cin' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:150',
            'position' => ($partial ? 'sometimes|' : '').'required|string|max:150',
            'daily_rate' => 'nullable|numeric|min:0',
            'monthly_salary' => 'nullable|numeric|min:0',
            'hire_date' => 'nullable|date',
            'contract_type' => 'nullable|in:CDI,CDD,Vacataire',
            'remuneration_type' => 'nullable|in:Salaire,Jour,Heure,Mission',
            'status' => 'nullable|in:actif,inactif',
            'notes' => 'nullable|string',
        ];

        $data = $request->validate($rules);
        if (! $partial) {
            $data['status'] = $data['status'] ?? 'actif';
            $data['daily_rate'] = $data['daily_rate'] ?? 0;
            $data['monthly_salary'] = $data['monthly_salary'] ?? 0;
        }

        return $data;
    }

    private function format(Employee $e): array
    {
        return [
            'id' => $e->id,
            'matricule' => $e->matricule,
            'first_name' => $e->first_name,
            'last_name' => $e->last_name,
            'full_name' => $e->full_name,
            'cin' => $e->cin,
            'phone' => $e->phone,
            'email' => $e->email,
            'address' => $e->address,
            'position' => $e->position,
            'daily_rate' => $e->daily_rate,
            'monthly_salary' => $e->monthly_salary,
            'hire_date' => optional($e->hire_date)->format('d/m/Y'),
            'hire_date_raw' => optional($e->hire_date)->format('Y-m-d'),
            'contract_type' => $e->contract_type,
            'remuneration_type' => $e->remuneration_type,
            'status' => $e->status,
            'notes' => $e->notes,
            'created_at' => optional($e->created_at)->format('d/m/Y'),
            'created_at_raw' => optional($e->created_at)->format('Y-m-d'),
        ];
    }
}
