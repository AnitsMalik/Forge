export class GoogleDriveParser {
  parseMetadata(filePayload: any) {
    return {
      fileId: filePayload.id,
      name: filePayload.name,
      mimeType: filePayload.mimeType,
    };
  }
}
