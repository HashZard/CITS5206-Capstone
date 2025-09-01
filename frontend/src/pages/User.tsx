import React from "react";

/** Placeholder user profile page */
export default function UserPage({ email }: { email: string }) {
  return (
    <div className="max-w-3xl mx-auto text-white">
      <h1 className="text-3xl font-semibold mb-4">User</h1>
      <p className="text-white/80">Signed in as: {email}</p>
      <p className="mt-4 text-white/70">
        This is a placeholder user page. Future profile and settings will go here.
      </p>
    </div>
  );
}
