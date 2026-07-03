"use client";

import { Button } from "@matthiaskrijgsman/mat-ui";

export default function PlaygroundPage() {
    return (
        <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
            <header className="flex items-baseline justify-between">
                <h1 className="text-2xl font-semibold">mat-builder playground</h1>
                <span className="text-sm text-gray-500">
                    v{process.env.NEXT_PUBLIC_LIB_VERSION}
                </span>
            </header>

            <p className="text-gray-600">
                Development surface for <code>@matthiaskrijgsman/mat-builder</code>. The kitchen-sink
                email builder lands here in phase 2 of the build order — see <code>docs/README.md</code>.
            </p>

            {/* Proves the mat-ui dependency chain is wired up */}
            <div>
                <Button onClick={() => alert("mat-ui is wired up")}>mat-ui Button</Button>
            </div>
        </main>
    );
}
