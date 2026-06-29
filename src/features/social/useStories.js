import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import storiesApi from "./storiesApi";

const MINE_KEY = ["stories", "mine"];
const FEED_KEY = ["stories", "feed"];

export default function useStories() {
  const queryClient = useQueryClient();

  const { data: myStories = [] } = useQuery({ queryKey: MINE_KEY, queryFn: storiesApi.fetchMine });
  const { data: groups = [], isLoading } = useQuery({ queryKey: FEED_KEY, queryFn: storiesApi.fetchFeed });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: MINE_KEY });
    queryClient.invalidateQueries({ queryKey: FEED_KEY });
  };

  const createText = useMutation({ mutationFn: storiesApi.createTextStory, onSuccess: invalidate });
  const createImage = useMutation({ mutationFn: storiesApi.createImageStory, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: storiesApi.remove, onSuccess: invalidate });

  return {
    myStories,
    groups,
    loading: isLoading,
    createTextStory: createText.mutateAsync,
    createImageStory: createImage.mutateAsync,
    creating: createText.isPending || createImage.isPending,
    deleteStory: (id) => remove.mutate(id),
    markViewed: storiesApi.markViewed,
  };
}
