import React from 'react';

export function AnimatedCharacter({ children }: { children: React.ReactNode }) {
    // Generate a random animation delay between 0-5s
    const delay = Math.random() * 5;

    return (
        <span
            className="inline-block animate-pulse"
            style={{
                animationDuration: `${2 + Math.random() * 3}s`,
                animationDelay: `${delay}s`
            }}
        >
            {children}
        </span>
    );
} 