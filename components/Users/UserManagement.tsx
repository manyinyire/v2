"use client"

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Download, Edit, Trash2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

type UserRole = 'admin' | 'manager' | 'agent'

interface SBU {
  id: string
  name: string
  description: string
}

interface User {
  id: string
  full_name: string
  email: string
  role: UserRole
  created_at: string
  last_sign_in_at?: string
  sbu_name?: string
  sbu_id?: string
}

interface NewUser {
  email: string
  full_name: string
  role: UserRole
  sbu_id?: string
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [sbus, setSBUs] = useState<SBU[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    full_name: '',
    role: 'agent',
    sbu_id: undefined
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

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true)
      console.log('Fetching users...')
      
      const response = await fetch('/api/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Server response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Fetched users:', data)
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchSBUs()
  }, [])

  // Create user
  const handleCreateUser = async () => {
    try {
      if (!newUser.email || !newUser.full_name || !newUser.role) {
        toast.error('Please fill in all required fields')
        return
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create user')
      }

      toast.success('User created successfully')
      await fetchUsers()
      setNewUser({ email: '', full_name: '', role: 'agent', sbu_id: undefined })
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create user')
    }
  }

  // Update user
  const handleUpdateUser = async () => {
    if (!editingUser) return

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          full_name: editingUser.full_name,
          email: editingUser.email,
          role: editingUser.role,
          sbu_id: editingUser.sbu_id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update user')
      }

      toast.success('User updated successfully')
      await fetchUsers()
      setEditingUser(null)
      setEditDialogOpen(false)
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update user')
    }
  }

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete user')
      }

      toast.success('User deleted successfully')
      await fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete user')
    }
  }

  // Export users
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
          <Button onClick={handleExportUsers} variant="outline" size="icon" title="Export Users">
            <Download className="h-4 w-4" />
          </Button>
          <Button onClick={fetchUsers} variant="outline" size="icon" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Add User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value: UserRole) => 
                      setNewUser(prev => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sbu">SBU</Label>
                  <Select
                    value={newUser.sbu_id}
                    onValueChange={(value: string) => 
                      setNewUser(prev => ({ ...prev, sbu_id: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select SBU" />
                    </SelectTrigger>
                    <SelectContent>
                      {sbus.map(sbu => (
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
        {loading ? (
          <div className="flex justify-center p-4">Loading...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>SBU</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
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
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            title="Edit User"
                            onClick={() => setEditingUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit User</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="edit-name">Name</Label>
                              <Input
                                id="edit-name"
                                value={editingUser?.full_name || ''}
                                onChange={(e) => setEditingUser(prev => 
                                  prev ? { ...prev, full_name: e.target.value } : null
                                )}
                                placeholder="John Doe"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="edit-email">Email</Label>
                              <Input
                                id="edit-email"
                                type="email"
                                value={editingUser?.email || ''}
                                onChange={(e) => setEditingUser(prev => 
                                  prev ? { ...prev, email: e.target.value } : null
                                )}
                                placeholder="user@example.com"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="edit-role">Role</Label>
                              <Select
                                value={editingUser?.role || 'agent'}
                                onValueChange={(value: UserRole) => 
                                  setEditingUser(prev => 
                                    prev ? { ...prev, role: value } : null
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="agent">Agent</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="edit-sbu">SBU</Label>
                              <Select
                                value={editingUser?.sbu_id}
                                onValueChange={(value: string) => 
                                  setEditingUser(prev => 
                                    prev ? { ...prev, sbu_id: value } : null
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select SBU" />
                                </SelectTrigger>
                                <SelectContent>
                                  {sbus.map(sbu => (
                                    <SelectItem key={sbu.id} value={sbu.id}>
                                      {sbu.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleUpdateUser}>Save Changes</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete User"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}