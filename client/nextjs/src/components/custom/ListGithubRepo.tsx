"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Loader2, Lock, LockOpen } from "lucide-react";
import { Dispatch, SetStateAction } from "react";
import { IGithubRepo } from "./ChatPage";
import { toast } from "sonner";
import api from "@/helpers/api";


type ListGithubRepoProps = {
    isOpen: boolean;
    onClose: () => void;
    repos: IGithubRepo[] | null;
    isLoading: boolean;
    setRepos: Dispatch<SetStateAction<IGithubRepo[] | null>>;
};

// This will show the list of github repos and allow the user to toggle the code review on/off
const ListGithubRepo = ({ isOpen, onClose, repos, isLoading, setRepos }: ListGithubRepoProps) => {


    const handleToggle = async (repoId: string, checked: boolean) => {
        const previous = repos;
        try {
            setRepos((prev) =>
                (prev ?? []).map((repo) =>
                    String(repo._id) === repoId || String(repo.id) === repoId
                        ? { ...repo, enableCodeReview: checked }
                        : repo
                )
            );
            const response = await api.get(`/api/enable-disable-code-review/${repoId}`);
            if (response.status !== 200) {
                throw new Error("Failed to enable/disable code review");
            }
            if (response.data?.data) {
                setRepos((prev) =>
                    (prev ?? []).map((repo) =>
                        String(repo._id) === repoId || String(repo.id) === repoId
                            ? { ...repo, ...response.data.data }
                            : repo
                    )
                );
            }
            toast.success(
                checked
                    ? "Code review on — webhook created on GitHub"
                    : "Code review off — webhook removed"
            );
        } catch (error) {
            // console.log(error);
            setRepos(previous);
            const message =
                (error as { response?: { data?: { message?: string } } })?.response
                    ?.data?.message || "Failed to enable/disable code review";
            toast.error(message);
        }
    };

    // This is a loading state for the dialog
    if (isLoading) {
        return (
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-h-[80vh] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Code Review Repos</DialogTitle>
                        <DialogDescription>
                            <Loader2 className="size-4 animate-spin" />
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[80vh] sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Code Review Repos</DialogTitle>
                    <DialogDescription>
                        Turn on a repo to include it for code review.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[55vh] no-scrollbar space-y-1 overflow-y-auto pr-1">
                    {!repos || repos.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            No repositories found.
                        </p>
                    ) : (
                        repos.map((repo) => {
                            const repoId = String(repo.id);
                            return (
                                <div
                                    key={repo._id ?? repoId}
                                    className="flex items-center justify-between gap-3 rounded-md px-2 py-2.5 hover:bg-muted/60"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            {repo.private ? (
                                                <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                                            ) : (
                                                <LockOpen className="size-3.5 shrink-0 text-muted-foreground" />
                                            )}
                                            <p className="truncate text-sm font-medium">{repo.name}</p>
                                        </div>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {repo.fullName}
                                            <span className="mx-1">·</span>
                                            {repo.defaultBranch}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={repo.enableCodeReview}
                                        onCheckedChange={(checked) =>
                                            handleToggle(repoId, checked)
                                        }
                                        aria-label={`Toggle ${repo.name}`}
                                    />
                                </div>
                            );
                        })
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ListGithubRepo;
