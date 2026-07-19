"use client"

import { useEffect, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AxiosError } from "axios"
import { toast } from "sonner"
import api from "@/helpers/api"
import { Loader2, Mail, X } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/context/ChatContext"

const CollaboratePeopleChat = ({ onClose, isOpen, chatId }: { onClose: () => void, isOpen: boolean, chatId: string }) => {
    const [email, setEmail] = useState("");
    const [listOfPeopleCollaborate, setListOfPeopleCollaborate] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingPeopleCollaborate, setIsLoadingPeopleCollaborate] = useState(false);
    const { user } = useAuth();
    useEffect(() => {
        const getPeopleCollaborate = async () => {
            try {
                setIsLoadingPeopleCollaborate(true);
                const response = await api.get(`/api/get-people-collaborate/${chatId}`);
                if (!response) {
                    throw new Error("Failed to get people collaborate");
                }
                setListOfPeopleCollaborate(response?.data?.peopleCollaborate || []);
            }
            catch (error) {
                const message = error instanceof AxiosError ? error?.response?.data?.message || error.message : "Failed to get people collaborate";
                console.error(error);
                toast.error(message);
            } finally {
                setIsLoadingPeopleCollaborate(false);
            }
        }
        getPeopleCollaborate();
    }, [chatId]);

    const handleSendInvite = async () => {
        if (email === user?.email) {
            toast.error("You cannot invite yourself");
            return;
        }
        try {
            setIsLoading(true);
            const response = await api.post("/api/send-email-invite", {
                email,
                chatId,
            });

            if (!response) {
                throw new Error("Failed to send invite");
            }

            toast.success("Invite sent successfully");
            onClose();
        } catch (error) {
            const message = error instanceof AxiosError ? error?.response?.data?.message || error.message : "Failed to send invite";
            console.error(error);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }

    const handleRemoveCollaborator = async (email: string) => {
        try {
            const response = await api.post("/api/remove-collaborator", {
                email,
                chatId,
            });
            if (!response) {
                throw new Error("Failed to remove collaborator");
            }
            toast.success("Collaborator removed successfully");
            // console.log("Response", response);
            setListOfPeopleCollaborate(response?.data?.peopleCollaborate || []);
        } catch (error) {
            const message = error instanceof AxiosError ? error?.response?.data?.message || error.message : "Failed to remove collaborator";
            console.error(error);
            toast.error(message);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite to collaborate</DialogTitle>
                    <DialogDescription>
                        Enter the email of the person you want to invite to this chat.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                    <label htmlFor="collaborate-email" className="text-sm font-medium">
                        Email
                    </label>
                    <Input
                        id="collaborate-email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                    />
                </div>
                <div className="grid gap-2">
                    <h3 className="text-sm font-medium">Collaborators</h3>
                    {isLoadingPeopleCollaborate ? (
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                        </div>
                    ) : listOfPeopleCollaborate.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No collaborators yet.</p>
                    ) : (
                        <ul className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                            {listOfPeopleCollaborate?.map((personEmail) => (
                                <li
                                    key={personEmail}
                                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                                >
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                                        <span className="truncate">{personEmail}</span>
                                    </div>
                                    <Button variant="outline" size="icon" className="hover:cursor-pointer" onClick={() => handleRemoveCollaborator(personEmail)}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button disabled={!email.trim() || isLoading || email === user?.email} onClick={handleSendInvite}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send invite"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default CollaboratePeopleChat;
