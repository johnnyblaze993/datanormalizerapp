import React from "react";
import Link from "next/link";

export default function Home() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center">
            <h1 className="text-4xl font-bold mb-6">Welcome to Data Normalizer App</h1>
            <Link href="/(features)/data-normalizer" className="px-6 py-3 bg-blue-600 text-white rounded shadow">
                Go to Data Normalizer
            </Link>
        </main>
    );
}
