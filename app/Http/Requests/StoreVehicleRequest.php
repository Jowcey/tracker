<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreVehicleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(
            $this->current_organization_id,
            ['owner', 'admin', 'manager']
        );
    }

    public function rules(): array
    {
        return [
            'tracker_id' => 'nullable|exists:trackers,id',
            'name' => 'required|string|max:255',
            'type' => 'required|in:vehicle,person,asset',
            'registration_number' => 'nullable|string|max:255',
            'make' => 'nullable|string|max:255',
            'model' => 'nullable|string|max:255',
            'year' => 'nullable|integer|min:1900|max:' . (date('Y') + 1),
            'color' => 'nullable|string|max:255',
            'vin' => 'nullable|string|max:255',
            'metadata' => 'nullable|array',
            'is_active' => 'boolean',
        ];
    }
}

