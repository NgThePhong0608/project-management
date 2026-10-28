<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get('/profile');

        $response->assertOk();
    }

    public function test_profile_information_can_be_updated(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_user_can_delete_their_account(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->delete('/profile', [
                'password' => 'password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/');

        $this->assertGuest();
        $this->assertNull($user->fresh());
    }

    public function test_correct_password_must_be_provided_to_delete_account(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->delete('/profile', [
                'password' => 'wrong-password',
            ]);

        $response
            ->assertSessionHasErrors('password')
            ->assertRedirect('/profile');

        $this->assertNotNull($user->fresh());
    }

    public function test_user_can_upload_replace_and_remove_avatar(): void
    {
        Storage::fake();

        $user = User::factory()->create();
        $avatar1 = UploadedFile::fake()->image('avatar1.png');

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $avatar1,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();
        $this->assertNotNull($user->avatar_path);
        $this->assertStringStartsWith('avatar/', $user->avatar_path);
        $this->assertNotNull($user->avatar_url);
        Storage::assertExists($user->avatar_path);

        $oldPath = $user->avatar_path;

        // Replace avatar
        $avatar2 = UploadedFile::fake()->image('avatar2.png');
        $this->actingAs($user)->patch('/profile', [
            'name' => $user->name,
            'email' => $user->email,
            'avatar' => $avatar2,
        ]);

        $user->refresh();
        $this->assertNotEquals($oldPath, $user->avatar_path);
        Storage::assertExists($user->avatar_path);
        Storage::assertMissing($oldPath);

        $secondPath = $user->avatar_path;

        // Remove avatar
        $this->actingAs($user)->patch('/profile', [
            'name' => $user->name,
            'email' => $user->email,
            'remove_avatar' => true,
        ]);

        $user->refresh();
        $this->assertNull($user->avatar_path);
        Storage::assertMissing($secondPath);
    }

    public function test_user_can_upload_replace_and_remove_cover_photo(): void
    {
        Storage::fake();

        $user = User::factory()->create();
        $cover1 = UploadedFile::fake()->image('cover1.png', 1200, 320);

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => $user->name,
                'email' => $user->email,
                'cover' => $cover1,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();
        $this->assertNotNull($user->cover_path);
        $this->assertStringStartsWith('cover/', $user->cover_path);
        $this->assertNotNull($user->cover_url);
        Storage::assertExists($user->cover_path);

        $oldCoverPath = $user->cover_path;

        // Replace cover
        $cover2 = UploadedFile::fake()->image('cover2.png', 1200, 320);
        $this->actingAs($user)->patch('/profile', [
            'name' => $user->name,
            'email' => $user->email,
            'cover' => $cover2,
        ]);

        $user->refresh();
        $this->assertNotEquals($oldCoverPath, $user->cover_path);
        Storage::assertExists($user->cover_path);
        Storage::assertMissing($oldCoverPath);

        $secondCoverPath = $user->cover_path;

        // Remove cover
        $this->actingAs($user)->patch('/profile', [
            'name' => $user->name,
            'email' => $user->email,
            'remove_cover' => true,
        ]);

        $user->refresh();
        $this->assertNull($user->cover_path);
        Storage::assertMissing($secondCoverPath);
    }

    public function test_login_and_logout_histories_are_recorded_and_visible_to_admin(): void
    {
        $member = User::factory()->create(['role' => 'member']);
        $admin = User::factory()->create(['role' => 'admin']);

        // Member logs in
        $this->post('/login', [
            'email' => $member->email,
            'password' => 'password',
        ]);

        $this->assertDatabaseHas('login_histories', [
            'user_id' => $member->id,
            'event' => 'login',
        ]);

        // Member logs out
        $this->actingAs($member)->post('/logout');

        $this->assertDatabaseHas('login_histories', [
            'user_id' => $member->id,
            'event' => 'logout',
        ]);

        // Member views own profile: sees own loginHistories, empty memberLoginHistories
        $this->actingAs($member)
            ->get('/profile')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Profile/Edit')
                ->has('loginHistories', 2)
                ->has('memberLoginHistories', 0)
            );

        // Admin views profile: sees memberLoginHistories of non-admin roles
        $this->actingAs($admin)
            ->get('/profile')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Profile/Edit')
                ->has('memberLoginHistories', 2)
            );

        // Admin views member's User/Show page: sees member's loginHistories
        $this->actingAs($admin)
            ->get(route('user.show', $member->id))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('User/Show')
                ->has('loginHistories', 2)
            );
    }
}
