import { customAlphabet } from "nanoid";

const alphabet = "123456789abcdefghjkmnpqrstuvwxyz";
export const nanoid = customAlphabet(alphabet, 12);
