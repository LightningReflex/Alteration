/**
 * Recursively fix a nbt object by removing null values
 * @param nbt the nbt object to fix
 */
export function fixNbt(nbt: any) {
    for (const key of Object.keys(nbt)) {
        if (nbt[key] === null) delete nbt[key]
        else if (typeof nbt[key] === "object" && !Array.isArray(nbt)) fixNbt(nbt[key])
    }
}
