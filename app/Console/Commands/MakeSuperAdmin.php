<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class MakeSuperAdmin extends Command
{
    protected $signature = 'app:make-super-admin {email : The email address of the user to promote}';

    protected $description = 'Grant or revoke super admin privileges for a user';

    public function handle(): int
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("No user found with email: {$email}");
            return 1;
        }

        if ($user->is_super_admin) {
            if (!$this->confirm("{$user->name} is already a super admin. Revoke?")) {
                return 0;
            }
            $user->update(['is_super_admin' => false]);
            $this->info("Super admin revoked for {$user->name} ({$user->email})");
        } else {
            $user->update(['is_super_admin' => true]);
            $this->info("Super admin granted to {$user->name} ({$user->email})");
        }

        return 0;
    }
}
