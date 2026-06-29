import { SocialFeed } from "../features/social";

// Trainer Social — the unified Social module placed in the light Trainer shell.
export default function TSocial() {
  return (
    <div className="p-4 sm:p-6">
      <SocialFeed canCreate={true} />
    </div>
  );
}
