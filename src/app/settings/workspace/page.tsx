"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Users, Settings, Plus, UserPlus, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface WorkspaceMember {
  user_id: string;
  role: string;
  email?: string;
  full_name?: string;
}

export default function WorkspaceSettingsPage() {
  const { isAuthenticated, user, activeWorkspace, fetchWorkspaces } = useAuth();
  const { toast } = useToast();
  
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (activeWorkspace) {
      setNewName(activeWorkspace.name);
      fetchMembers();
    }
  }, [activeWorkspace]);

  const fetchMembers = async () => {
    if (!activeWorkspace) return;
    setIsLoading(true);
    try {
      // In a real app with proper foreign key to users, we'd fetch the email.
      // Since auth.users is in a separate schema, we might not be able to easily join.
      // For this implementation, we will just fetch the workspace_members.
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', activeWorkspace.id);

      if (error) throw error;
      setMembers(data as WorkspaceMember[]);
    } catch (err: any) {
      toast({ title: "Error fetching members", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRename = async () => {
    if (!activeWorkspace || !newName.trim() || newName === activeWorkspace.name) return;
    setIsRenaming(true);
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ name: newName.trim() })
        .eq('id', activeWorkspace.id);
        
      if (error) throw error;
      toast({ title: "Success", description: "Workspace renamed successfully." });
      await fetchWorkspaces();
    } catch (err: any) {
      toast({ title: "Error renaming workspace", description: err.message, variant: "destructive" });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim() || !user) return;
    setIsCreating(true);
    try {
      // Note: The handle_new_user trigger creates the first workspace.
      // To create a second one, we insert into workspaces.
      const newWorkspaceId = crypto.randomUUID();
      const { error } = await supabase
        .from('workspaces')
        .insert([{ id: newWorkspaceId, name: newWorkspaceName.trim() }]);
        
      if (error) throw error;
      
      // Add user as owner
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert([{ workspace_id: newWorkspaceId, user_id: user.uid, role: 'owner' }]);
        
      if (memberError) throw memberError;
      
      toast({ title: "Success", description: "Workspace created successfully." });
      setNewWorkspaceName("");
      setIsCreateDialogOpen(false);
      await fetchWorkspaces();
    } catch (err: any) {
      toast({ title: "Error creating workspace", description: err.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleInvite = async () => {
    // In a full implementation, you'd send an email or lookup the user by email in a public profiles table.
    // For this prototype, we'll just show a toast indicating this would send an invite link.
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast({ 
        title: "Invite Sent", 
        description: `An invitation has been sent to ${inviteEmail}. They can join using the link in the email.` 
      });
      setInviteEmail("");
    } finally {
      setIsInviting(false);
    }
  };

  const amIOwner = members.find(m => m.user_id === user?.uid)?.role === 'owner';

  if (!isClient) return null;

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex justify-center items-center h-[50vh]">
        <div className="text-center space-y-4">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-bold">Please log in</h2>
          <p className="text-muted-foreground">You must be logged in to manage workspaces.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            Workspace Settings
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage your team's workspace, members, and settings.
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Workspace</DialogTitle>
              <DialogDescription>
                Workspaces allow you to collaborate with different teams or isolate projects.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="ws-name">Workspace Name</Label>
              <Input 
                id="ws-name" 
                value={newWorkspaceName} 
                onChange={(e) => setNewWorkspaceName(e.target.value)} 
                placeholder="e.g. QA Team Alpha"
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateWorkspace} disabled={!newWorkspaceName.trim() || isCreating}>
                {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {activeWorkspace ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Update your workspace details.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-2 max-w-md">
                <Label htmlFor="workspace-name">Workspace Name</Label>
                <div className="flex gap-2">
                  <Input 
                    id="workspace-name" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)} 
                    disabled={!amIOwner}
                  />
                  {amIOwner && (
                    <Button onClick={handleRename} disabled={isRenaming || newName === activeWorkspace.name}>
                      {isRenaming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                  )}
                </div>
                {!amIOwner && <p className="text-xs text-muted-foreground mt-1">Only workspace owners can rename the workspace.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>Manage who has access to this workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              {amIOwner && (
                <div className="flex items-end gap-2 mb-6 p-4 bg-muted/30 rounded-lg border">
                  <div className="flex-grow space-y-2">
                    <Label htmlFor="invite-email">Invite new member</Label>
                    <Input 
                      id="invite-email" 
                      type="email" 
                      placeholder="colleague@example.com" 
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleInvite} disabled={!inviteEmail.trim() || isInviting}>
                    {isInviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                    Send Invite
                  </Button>
                </div>
              )}

              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Role</TableHead>
                        {amIOwner && <TableHead className="w-[100px]"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.user_id}>
                          <TableCell className="font-mono text-xs">{member.user_id}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${member.role === 'owner' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                              {member.role}
                            </span>
                          </TableCell>
                          {amIOwner && (
                            <TableCell>
                              {member.user_id !== user?.uid && (
                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="p-12 text-center flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p>Loading workspace data...</p>
        </Card>
      )}
    </div>
  );
}
