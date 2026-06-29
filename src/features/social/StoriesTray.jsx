import { useState } from "react";
import { Plus } from "lucide-react";
import Avatar from "./Avatar";
import StoryComposer from "./StoryComposer";
import StoryViewer from "./StoryViewer";
import useStories from "./useStories";

/**
 * Stories tray — "Your story" circle (add / view) followed by one circle per
 * person who has active stories. Opens the composer or the full-screen viewer.
 *
 * Props: currentUser (auth object), dark
 */
export default function StoriesTray({ currentUser, dark = false }) {
  const {
    myStories, groups, loading,
    createTextStory, createImageStory, creating, deleteStory, markViewed,
  } = useStories();

  const [composerOpen, setComposerOpen] = useState(false);
  const [viewer, setViewer] = useState(null); // { stories, author, isOwn }

  const meUser = { name: currentUser?.name, profileImage: currentUser?.image || currentUser?.profileImage };

  const openMine = () => {
    if (myStories.length > 0) {
      setViewer({ stories: myStories, author: { ...meUser, name: "Your story" }, isOwn: true });
    } else {
      setComposerOpen(true);
    }
  };

  const t = dark ? { name: "text-gray-300", add: "bg-[#181A22] border border-white/[0.1] text-gray-300" } : { name: "text-gray-600", add: "bg-white border border-gray-200 text-gray-500" };

  // Ring indicators: unseen = colored (orange), all-seen = grey.
  const ringUnseen = "ring-2 ring-orange-500 ring-offset-2 ring-offset-transparent";
  const ringSeen = dark
    ? "ring-2 ring-gray-600 ring-offset-2 ring-offset-transparent"
    : "ring-2 ring-gray-300 ring-offset-2 ring-offset-transparent";

  if (loading && groups.length === 0 && myStories.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-start gap-4 overflow-x-auto pb-1">
        {/* Your story */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16">
          <div className="relative">
            <button onClick={openMine} className="block">
              <Avatar user={meUser} size={60} dark={dark} ring={myStories.length > 0 ? ringUnseen : ""} />
            </button>
            <button
              onClick={() => setComposerOpen(true)}
              className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ${t.add}`}
              title="Add to your story"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <span className={`text-[11px] truncate w-full text-center ${t.name}`}>Your story</span>
        </div>

        {/* Other people's stories — colored ring if any unseen, grey if all seen */}
        {groups.map((g) => {
          const unseen = (g.stories || []).some((s) => !s.hasViewed);
          return (
            <button
              key={g.userId}
              onClick={() => setViewer({ stories: g.stories, author: { name: g.name, profileImage: g.profileImage }, isOwn: false })}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16"
            >
              <Avatar user={{ name: g.name, profileImage: g.profileImage }} size={60} dark={dark} ring={unseen ? ringUnseen : ringSeen} />
              <span className={`text-[11px] truncate w-full text-center ${t.name}`}>{g.name}</span>
            </button>
          );
        })}
      </div>

      <StoryComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreateText={createTextStory}
        onCreateImage={createImageStory}
        creating={creating}
      />

      <StoryViewer
        open={!!viewer}
        stories={viewer?.stories || []}
        author={viewer?.author}
        isOwn={viewer?.isOwn}
        onDelete={deleteStory}
        markViewed={markViewed}
        onClose={() => setViewer(null)}
      />
    </div>
  );
}
