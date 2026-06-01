export interface ProcessedMedia {
    originalPath: string;
    compressedPath: string;
    thumbnailPath?: string;
    duration: number;
    size: number;
    mimeType: string;
}
export declare class MediaService {
    private uploadDir;
    private tempDir;
    constructor(uploadDir?: string, tempDir?: string);
    private ensureDirectories;
    processVideo(inputPath: string, messageId: string): Promise<ProcessedMedia>;
    processAudio(inputPath: string, messageId: string): Promise<ProcessedMedia>;
    getMediaUrl(filename: string): string;
}
//# sourceMappingURL=MediaService.d.ts.map