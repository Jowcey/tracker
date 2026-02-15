<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLocationRequest extends FormRequest
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
            'tracker_id' => 'required|exists:trackers,id',
            'vehicle_id' => 'nullable|exists:vehicles,id',
            'latitude' => 'required|numeric|min:-90|max:90',
            'longitude' => 'required|numeric|min:-180|max:180',
            'altitude' => 'nullable|numeric',
            'speed' => 'nullable|numeric|min:0',
            'heading' => 'nullable|numeric|min:0|max:360',
            'accuracy' => 'nullable|numeric|min:0',
            'satellites' => 'nullable|integer|min:0',
            'address' => 'nullable|string|max:255',
            'recorded_at' => 'nullable|date',
        ];
    }
}

