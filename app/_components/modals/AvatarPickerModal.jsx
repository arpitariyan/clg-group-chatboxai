"use client"
import React from 'react'
import Image from 'next/image'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Check } from 'lucide-react'

const MEN_AVATARS = [
    { label: 'Men 1', src: '/avatar/Men-1.png' },
    { label: 'Men 2', src: '/avatar/Men-2.png' },
    { label: 'Men 3', src: '/avatar/Men-3.png' },
    { label: 'Men 4', src: '/avatar/Men-4.png' },
    { label: 'Men 5', src: '/avatar/Men-5.png' },
    { label: 'Men 6', src: '/avatar/Men-6.png' },
    { label: 'Men 7', src: '/avatar/Men-7.png' },
    { label: 'Men 8', src: '/avatar/Men-8.png' },
]

const WOMAN_AVATARS = [
    { label: 'Woman 1', src: '/avatar/woman-1.png' },
    { label: 'Woman 2', src: '/avatar/woman-2.png' },
    { label: 'Woman 3', src: '/avatar/woman-3.png' },
    { label: 'Woman 4', src: '/avatar/woman-4.png' },
    { label: 'Woman 5', src: '/avatar/woman-5.png' },
    { label: 'Woman 6', src: '/avatar/woman-6.png' },
    { label: 'Woman 7', src: '/avatar/woman-7.png' },
    { label: 'Woman 8', src: '/avatar/woman-8.png' },
]

const AvatarGrid = ({ avatars, currentAvatar, onSelect }) => (
    <div className="grid grid-cols-4 gap-3">
        {avatars.map((avatar) => {
            const isSelected = currentAvatar === avatar.src
            return (
                <button
                    key={avatar.src}
                    onClick={() => onSelect(avatar.src)}
                    title={avatar.label}
                    className={`
                        relative group rounded-xl overflow-hidden border-2 transition-all duration-200
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                        ${isSelected
                            ? 'border-primary shadow-md shadow-primary/20 scale-105'
                            : 'border-transparent hover:border-primary/50 hover:scale-[1.03]'
                        }
                    `}
                >
                    <Image
                        src={avatar.src}
                        alt={avatar.label}
                        width={96}
                        height={96}
                        className="w-full aspect-square object-cover"
                    />
                    {isSelected && (
                        <span className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <span className="bg-primary text-primary-foreground rounded-full p-0.5">
                                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                            </span>
                        </span>
                    )}
                </button>
            )
        })}
    </div>
)

const AvatarPickerModal = ({ isOpen, onClose, currentAvatar, onSelect }) => {
    const handleSelect = (src) => {
        onSelect(src)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-105 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Choose Your Avatar</DialogTitle>
                    <DialogDescription>
                        Select an avatar to represent you across the app.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Men section */}
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Men
                        </p>
                        <AvatarGrid
                            avatars={MEN_AVATARS}
                            currentAvatar={currentAvatar}
                            onSelect={handleSelect}
                        />
                    </div>

                    {/* Women section */}
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Women
                        </p>
                        <AvatarGrid
                            avatars={WOMAN_AVATARS}
                            currentAvatar={currentAvatar}
                            onSelect={handleSelect}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default AvatarPickerModal
