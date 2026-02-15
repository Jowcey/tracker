<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class TraccarService
{
    protected string $baseUrl;
    protected string $username;
    protected string $password;

    public function __construct()
    {
        $this->baseUrl = config("services.traccar.url");
        $this->username = config("services.traccar.admin_user");
        $this->password = config("services.traccar.admin_password");
    }

    public function createDevice(string $name, string $uniqueId, string $category = "car"): ?array
    {
        $response = Http::withBasicAuth($this->username, $this->password)
            ->post("{$this->baseUrl}/api/devices", [
                "name" => $name,
                "uniqueId" => $uniqueId,
                "category" => $category,
            ]);

        return $response->successful() ? $response->json() : null;
    }

    public function getDevice(int $deviceId): ?array
    {
        $response = Http::withBasicAuth($this->username, $this->password)
            ->get("{$this->baseUrl}/api/devices/{$deviceId}");

        return $response->successful() ? $response->json() : null;
    }

    public function updateDevice(int $deviceId, array $data): ?array
    {
        $response = Http::withBasicAuth($this->username, $this->password)
            ->put("{$this->baseUrl}/api/devices/{$deviceId}", $data);

        return $response->successful() ? $response->json() : null;
    }

    public function deleteDevice(int $deviceId): bool
    {
        $response = Http::withBasicAuth($this->username, $this->password)
            ->delete("{$this->baseUrl}/api/devices/{$deviceId}");

        return $response->successful();
    }

    public function getPosition(int $deviceId): ?array
    {
        $response = Http::withBasicAuth($this->username, $this->password)
            ->get("{$this->baseUrl}/api/positions", [
                "deviceId" => $deviceId,
            ]);

        $positions = $response->successful() ? $response->json() : null;
        return $positions ? end($positions) : null;
    }
}
