import { useEffect, useMemo, useState } from 'react';

type UserAvatarProps = {
    name?: string | null;
    avatar?: string | null;
    className?: string;
    imageClassName?: string;
    textClassName?: string;
    label?: string;
};

function initialsFromName(name?: string | null): string {
    const initials = (name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
    return initials || 'S';
}

export default function UserAvatar({
    name,
    avatar,
    className = 'w-12 h-12 rounded-full bg-primary text-white',
    imageClassName = 'w-full h-full object-cover',
    textClassName = 'text-base font-bold',
    label = 'Avatar',
}: UserAvatarProps) {
    const avatarUrl = (avatar || '').trim();
    const canRenderImage = avatarUrl.startsWith('http');
    const initials = useMemo(() => initialsFromName(name), [name]);
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        setImageFailed(false);
    }, [avatarUrl]);

    return (
        <div
            role="img"
            aria-label={label}
            className={`inline-flex items-center justify-center overflow-hidden ${className}`}
        >
            {canRenderImage && !imageFailed ? (
                <img
                    src={avatarUrl}
                    alt={label}
                    onError={() => setImageFailed(true)}
                    className={imageClassName}
                />
            ) : (
                <span className={textClassName}>{initials}</span>
            )}
        </div>
    );
}
