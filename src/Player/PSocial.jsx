import { SocialFeed } from "../features/social";

// Player Social — the unified Social module placed in the light Player shell.
// (Referee uses this same Player shell, so this covers referee too.)
export default function PSocial() {
  return (
    <div className="p-4 sm:p-6">
      <SocialFeed canCreate={true} />
    </div>
  );
}
