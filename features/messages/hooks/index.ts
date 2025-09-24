// Messages hooks placeholder
export const useMessages = (roomId?: string) => {
  return { roomId, messages: [] as Array<{ id: string; text: string; author: string }> };
};

