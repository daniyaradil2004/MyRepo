import * as React from "react"
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import { Button } from "@/components/ui/button"

describe("Button component", () => {
    it("renders correctly with default props", () => {
        render(<Button>Click me</Button>)
        const button = screen.getByRole("button", { name: /click me/i })
        expect(button).toBeInTheDocument()
        expect(button).toHaveClass("bg-primary")
    })

    it("renders with different variants", () => {
        const { rerender } = render(<Button variant="destructive">Delete</Button>)
        expect(screen.getByRole("button")).toHaveClass("bg-destructive")

        rerender(<Button variant="outline">Outline</Button>)
        expect(screen.getByRole("button")).toHaveClass("border")

        rerender(<Button variant="ghost">Ghost</Button>)
        expect(screen.getByRole("button")).toHaveClass("hover:bg-accent")
    })

    it("renders with different sizes", () => {
        const { rerender } = render(<Button size="sm">Small</Button>)
        expect(screen.getByRole("button")).toHaveClass("h-8")

        rerender(<Button size="lg">Large</Button>)
        expect(screen.getByRole("button")).toHaveClass("h-10")

        rerender(<Button size="icon">Icon</Button>)
        expect(screen.getByRole("button")).toHaveClass("size-9")
    })

    it("can be disabled", () => {
        render(<Button disabled>Disabled</Button>)
        expect(screen.getByRole("button")).toBeDisabled()
    })

    it("renders as a different component when asChild is true", () => {
        render(
            <Button asChild>
                <a href="/test">Link Button</a>
            </Button>
        )
        const link = screen.getByRole("link", { name: /link button/i })
        expect(link).toBeInTheDocument()
        expect(link).toHaveClass("bg-primary")
    })
})
