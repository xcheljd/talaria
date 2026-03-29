export function ProfilePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold">Profile Settings</h1>
        <div className="rounded-lg border bg-card p-6 text-card-foreground">
          <p className="text-muted-foreground">
            Configure your profile to pre-fill template fields.
          </p>
          <div className="mt-4 rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
            Profile form will be available here
          </div>
        </div>
      </div>
    </div>
  );
}
