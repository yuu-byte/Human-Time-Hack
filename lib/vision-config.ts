// Keep upload, client encoding and per-request spending limits in agreement.
export const MAX_IMAGE_EDGE = 1536;
export const MAX_FRAME_DATA_LENGTH = 640_000;
export const MAX_UPLOAD_LENGTH = 8_000_000;
export const VISION_BATCH_SIZE = 3;
export const VISION_BATCH_RESERVE = 0.05;
export const visionReserve = (count: number) => Math.ceil(count / VISION_BATCH_SIZE) * VISION_BATCH_RESERVE;
