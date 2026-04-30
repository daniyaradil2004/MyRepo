import { cn } from "@/lib/utils"

describe("cn utility", () => {
    it("should merge class names", () => {
        expect(cn("base", "extra")).toBe("base extra")
    })

    it("should handle conditional classes", () => {
        expect(cn("base", true && "extra", false && "hidden")).toBe("base extra")
    })

    it("should merge tailwind classes correctly", () => {
        expect(cn("p-4", "p-2")).toBe("p-2")
    })

    it("should handle undefined and null", () => {
        expect(cn("base", undefined, null)).toBe("base")
    })
})
