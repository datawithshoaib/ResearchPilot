"use client";

import { History, LogOut } from "lucide-react";

import { useAuth, userProfile } from "@/components/auth/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ onOpenHistory }: { onOpenHistory: () => void }) {
  const { user, signOut } = useAuth();
  if (!user) return null;
  const profile = userProfile(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="focus-visible:ring-ring rounded-full outline-none focus-visible:ring-2"
        aria-label="Account menu"
      >
        <Avatar className="size-8 ring-1 ring-border">
          {profile.avatarUrl && (
            <AvatarImage src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" />
          )}
          <AvatarFallback className="bg-brand-gradient text-xs font-semibold text-white">
            {profile.initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{profile.name}</p>
          {profile.email && <p className="text-muted-foreground truncate text-xs">{profile.email}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onOpenHistory}>
          <History />
          Your briefs
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
