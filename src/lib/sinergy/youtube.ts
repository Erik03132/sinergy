
export interface YoutubeVideoDetails {
    id: string;
    title: string;
    description: string;
    publishedAt: string;
    channelTitle: string;
    channelId: string;
    thumbnailUrl: string;
    tags: string[];
    url: string;
}

export function extractYoutubeId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

export function extractChannelInfo(url: string): { type: 'handle' | 'id', value: string } | null {
    const handleMatch = url.match(/youtube\.com\/@([^/?]+)/);
    if (handleMatch) return { type: 'handle', value: handleMatch[1] };
    const idMatch = url.match(/youtube\.com\/channel\/([^/?]+)/);
    if (idMatch) return { type: 'id', value: idMatch[1] };
    return null;
}

export async function getChannelUploadsPlaylistId(channelInfo: { type: string, value: string }): Promise<string | null> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error("YOUTUBE_API_KEY is not defined.");
    let apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&key=${apiKey}`;
    if (channelInfo.type === 'id') apiUrl += `&id=${channelInfo.value}`;
    else if (channelInfo.type === 'handle') apiUrl += `&forHandle=@${channelInfo.value}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) return null;
        const data = await response.json();
        return data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads || null;
    } catch (error) {
        console.error("Failed to fetch channel uploads ID:", error);
        return null;
    }
}

export async function getPlaylistVideos(playlistId: string, maxResults: number = 3): Promise<YoutubeVideoDetails[]> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error("YOUTUBE_API_KEY is not defined.");
    const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${maxResults}&key=${apiKey}`;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) return [];
        const data = await response.json();
        return data.items?.map((item: any) => {
            const snippet = item.snippet;
            const thumbnail = snippet.thumbnails.maxres?.url || snippet.thumbnails.high?.url || snippet.thumbnails.medium?.url;
            return {
                id: snippet.resourceId.videoId,
                title: snippet.title,
                description: snippet.description,
                publishedAt: snippet.publishedAt,
                channelTitle: snippet.channelTitle,
                channelId: snippet.channelId,
                thumbnailUrl: thumbnail,
                tags: [],
                url: `https://www.youtube.com/watch?v=${snippet.resourceId.videoId}`
            };
        }) || [];
    } catch (error) {
        console.error("Failed to fetch playlist videos:", error);
        return [];
    }
}
