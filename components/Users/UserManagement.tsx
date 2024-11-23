"use client"

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Download, Edit, Trash2, RefreshCw, UserPlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUserManagement } from '@/hooks/useUserManagement'
import { toast } from "sonner"
import type { Database } from '@/types/supabase'

type UserRole = Database['public']['Enums']['user_role']

interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  sbu_id?: string
  created_at: string
}

interface SBU {
  id: string
  name: string
  description: string
}

export function UserManagement() {
  const { users, loading, fetchUsers, createUser, updateUser, deleteUser } = useUserManagement()
  const [sbus, setSBUs] = useState<SBU[]>([])
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    role: 'agent' as UserRole,
    sbu_id: undefined as string | undefined
  })

  // Fetch SBUs
  const fetchSBUs = async () => {
    try {
      const response = await fetch('/api/sbus')
      if (!response.ok) {
        throw new Error('Failed to fetch SBUs')
      }
      const { sbus } = await response.json()
      setSBUs(sbus)
    } catch (error) {
      console.error('Error fetching SBUs:', error)
      toast.error('Failed to fetch SBUs')
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchSBUs()
  }, [fetchUsers])

  // Handle user creation
  const handleCreateUser = async () => {
    try {
      if (!newUser.email || !newUser.full_name || !newUser.role) {
        toast.error('Please fill in all required fields')
        return
      }

      await createUser(newUser)
      setCreateDialogOpen(false)
      setNewUser({ email: '', full_name: '', role: 'agent' as UserRole, sbu_id: undefined })
    } catch (error) {
      console.error('Error creating user:', error)
    }
  }

  // Handle edit user
  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setEditDialogOpen(true)
  }

  // Handle update user
  const handleUpdateUser = async () => {
    try {
      if (!editingUser) return

      await updateUser({
        id: editingUser.id,
        full_name: editingUser.full_name,
        role: editingUser.role,
        sbu_id: editingUser.sbu_id
      })
      setEditDialogOpen(false)
      setEditingUser(null)
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  // Handle delete user
  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId)
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  // Export users to CSV
  const handleExportUsers = () => {
    const csvContent = [
      // Header
      ['Name', 'Email', 'Role', 'SBU', 'Last Login'].join(','),
      // Data
      ...users.map(user => [
        user.full_name,
        user.email,
        user.role,
        user.sbu_name || 'Not Assigned',
        user.last_sign_in_at ? format(new Date(user.last_sign_in_at), 'PPp') : 'Never'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `users_${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>User Management</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchUsers()}
            disabled={loading === 'loading'}
          >
            <RefreshCw className={`h-4 w-4 ${loading === 'loading' ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleExportUsers}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Role
                  </Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sbu" className="text-right">
                    SBU
                  </Label>
                  <Select
                    value={newUser.sbu_id}
                    onValueChange={(value) => setNewUser({ ...newUser, sbu_id: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select an SBU" />
                    </SelectTrigger>
                    <SelectContent>
                      {sbus.map((sbu) => (
                        <SelectItem key={sbu.id} value={sbu.id}>
                          {sbu.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateUser}>Create User</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>SBU</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.full_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="capitalize">{user.role}</TableCell>
                <TableCell>{user.sbu_name || 'Not Assigned'}</TableCell>
                <TableCell>
                  {user.last_sign_in_at
                    ? format(new Date(user.last_sign_in_at), 'PPp')
                    : 'Never'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditUser(user)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={editingUser.full_name}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, full_name: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">
                  Role
                </Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value: UserRole) =>
                    setEditingUser({ ...editingUser, role: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-sbu" className="text-right">
                  SBU
                </Label>
                <Select
                  value={editingUser.sbu_id}
                  onValueChange={(value) =>
                    setEditingUser({ ...editingUser, sbu_id: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select an SBU" />
                  </SelectTrigger>
                  <SelectContent>
                    {sbus.map((sbu) => (
                      <SelectItem key={sbu.id} value={sbu.id}>
                        {sbu.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}