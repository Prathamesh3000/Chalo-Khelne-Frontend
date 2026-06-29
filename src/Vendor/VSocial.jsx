import { SocialFeed } from "../features/social";

// Vendor Social — the unified Social module placed in the light Vendor shell.
export default function VSocial() {
  return (
    <div className="p-4 sm:p-6">
      <SocialFeed canCreate={true} />
    </div>
  );
}
