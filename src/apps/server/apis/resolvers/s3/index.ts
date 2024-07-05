import S3ImageUploadResolver from "./image_upload";
import ImageUrlFieldResolver from "./image_url";

const s3Resolvers = [S3ImageUploadResolver, ImageUrlFieldResolver];
export default s3Resolvers;
