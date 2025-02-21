import { openDB } from 'idb';

const DB_NAME = 'imageStorage';
const STORE_NAME = 'images';

export async function initDB() {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            db.createObjectStore(STORE_NAME);
        },
    });
}

export async function saveImage(key: string, image: Blob) {
    const db = await initDB();
    await db.put(STORE_NAME, image, key);
}

export async function getImage(key: string): Promise<Blob | undefined> {
    const db = await initDB();
    return db.get(STORE_NAME, key);
}

export async function deleteImage(key: string) {
    const db = await initDB();
    await db.delete(STORE_NAME, key);
}

export async function getImageAsDataUrl(key: string): Promise<string | undefined> {
    const blob = await getImage(key);
    if (!blob) return undefined;

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });
} 