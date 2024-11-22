"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, Edit, Trash2 } from 'lucide-react'
import { toast } from "sonner"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface User {
  id: string
  name: string
  email: string
  role: string
}

type TierLevel = 'tier1' | 'tier2' | 'tier3'

interface SLAConfig {
  tier1: number
  tier2: number
  tier3: number
}

interface TierAssignments {
  tier1: string[]
  tier2: string[]
  tier3: string[]
}

interface SBU {
  id: number
  name: string
  description: string
  status: 'active' | 'inactive'
  ticketCount: number
  lastUpdated: string
  slaConfig: SLAConfig
  tierAssignments: TierAssignments
  users: Record<string, { id: string; full_name: string; email: string }>
}

interface MultiSelectProps {
  options: User[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}

function MultiSelect({ options, selected, onChange, placeholder }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([])
        return
      }

      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
        if (!response.ok) {
          throw new Error('Failed to search users')
        }
        const { users } = await response.json()
        setSearchResults(users.map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        })))
      } catch (error) {
        console.error('Error searching users:', error)
        toast.error('Failed to search users')
      }
    }

    const debounceTimer = setTimeout(searchUsers, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  const selectedUsers = selected.map(id => 
    options.find(opt => opt.id === id)
  ).filter((user): user is User => user !== undefined)

  return (
    <Command className="overflow-visible bg-white">
      <div className="group border border-input px-3 py-2 text-sm rounded-md">
        <div className="flex gap-1 flex-wrap">
          {selectedUsers.map((user) => (
            <Badge key={user.id} variant="secondary" className="hover:bg-secondary">
              <div className="flex items-center">
                <span>{user.name}</span>
                <button
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onChange(selected.filter((s) => s !== user.id))
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onClick={() => onChange(selected.filter((s) => s !== user.id))}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </Badge>
          ))}
          <CommandInput
            placeholder={selectedUsers.length === 0 ? placeholder : "Add more users..."}
            className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
            value={searchQuery}
            onValueChange={setSearchQuery}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
          />
        </div>
      </div>
      <div className="relative mt-2">
        {open && (
          <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-auto">
              {(searchQuery ? searchResults : options)
                .filter(option => !selected.includes(option.id))
                .map((option) => (
                <CommandItem
                  key={option.id}
                  onSelect={() => {
                    onChange([...selected, option.id])
                    setSearchQuery("")
                  }}
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      selected.includes(option.id)
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <Check className={cn("h-4 w-4")} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{option.name}</span>
                    <span className="text-xs text-muted-foreground">{option.email}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        )}
      </div>
    </Command>
  )
}

export function SBUManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [sbus, setSBUs] = useState<SBU[]>([])
  const [editingSBU, setEditingSBU] = useState<SBU | null>(null)
  const [isAddSBUOpen, setIsAddSBUOpen] = useState(false)
  const [selectedTierUsers, setSelectedTierUsers] = useState<TierAssignments>({
    tier1: [],
    tier2: [],
    tier3: []
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const [newSBU, setNewSBU] = useState<Omit<SBU, 'id' | 'ticketCount' | 'lastUpdated'>>({
    name: '',
    description: '',
    status: 'active',
    slaConfig: {
      tier1: 30,
      tier2: 60,
      tier3: 120
    },
    tierAssignments: {
      tier1: [],
      tier2: [],
      tier3: []
    },
    users: {}
  })

  const tiers: TierLevel[] = ['tier1', 'tier2', 'tier3']

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/users')
        if (!response.ok) {
          throw new Error('Failed to fetch users')
        }
        const { users: fetchedUsers } = await response.json()
        setUsers(fetchedUsers)
      } catch (error) {
        console.error('Error fetching users:', error)
        toast.error('Failed to fetch users')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  useEffect(() => {
    const fetchSBUs = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/sbus')
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch SBUs')
        }

        setSBUs(data.sbus)
      } catch (err) {
        console.error('Error fetching SBUs:', err)
        setError(err as Error)
        toast.error('Failed to fetch SBUs')
      } finally {
        setLoading(false)
      }
    }

    fetchSBUs()
  }, [])

  const handleCreateSBU = async () => {
    try {
      const response = await fetch('/api/sbus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSBU),
      })

      if (!response.ok) {
        throw new Error('Failed to create SBU')
      }

      const data = await response.json()
      setSBUs([...sbus, data.sbu])
      toast.success('SBU created successfully')
      setIsAddSBUOpen(false)
      
      // Reset form
      setNewSBU({
        name: '',
        description: '',
        status: 'active',
        slaConfig: {
          tier1: 30,
          tier2: 60,
          tier3: 120
        },
        tierAssignments: {
          tier1: [],
          tier2: [],
          tier3: []
        },
        users: {}
      })
      setSelectedTierUsers({
        tier1: [],
        tier2: [],
        tier3: []
      })
    } catch (error) {
      console.error('Error creating SBU:', error)
      toast.error('Failed to create SBU')
    }
  }

  const handleUpdateSBU = async () => {
    if (!editingSBU) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/sbus', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingSBU.id,
          name: editingSBU.name,
          description: editingSBU.description,
          slaConfig: editingSBU.slaConfig,
          tierAssignments: editingSBU.tierAssignments
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update SBU');
      }

      const { sbu } = await response.json();
      setSBUs(prevSBUs => prevSBUs.map(s => s.id === sbu.id ? sbu : s));
      toast.success('SBU updated successfully');
      setEditingSBU(null);
    } catch (error) {
      console.error('Error updating SBU:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update SBU');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSBU = async (id: number) => {
    if (!confirm('Are you sure you want to delete this SBU?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/sbus/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete SBU');
      }

      setSBUs(prevSBUs => prevSBUs.filter(s => s.id !== id));
      toast.success('SBU deleted successfully');
    } catch (error) {
      console.error('Error deleting SBU:', error);
      toast.error('Failed to delete SBU');
    } finally {
      setLoading(false);
    }
  };

  const handleTierAssignmentChange = (tier: TierLevel, values: string[]) => {
    // Remove the selected users from other tiers first
    const otherTiers = tiers.filter(t => t !== tier);
    const updatedTierAssignments = { ...selectedTierUsers };
    
    values.forEach(userId => {
      otherTiers.forEach(otherTier => {
        updatedTierAssignments[otherTier] = updatedTierAssignments[otherTier].filter(id => id !== userId);
      });
    });
    
    // Update the current tier
    updatedTierAssignments[tier] = values;
    
    setSelectedTierUsers(updatedTierAssignments);
    setNewSBU({
      ...newSBU,
      tierAssignments: updatedTierAssignments
    });
  }

  const handleEditTierAssignmentChange = (tier: TierLevel, values: string[]) => {
    if (!editingSBU) return;
    
    // Remove the selected users from other tiers first
    const otherTiers = tiers.filter(t => t !== tier);
    const updatedTierAssignments = { ...editingSBU.tierAssignments };
    
    values.forEach(userId => {
      otherTiers.forEach(otherTier => {
        updatedTierAssignments[otherTier] = updatedTierAssignments[otherTier].filter(id => id !== userId);
      });
    });
    
    // Update the current tier
    updatedTierAssignments[tier] = values;
    
    setEditingSBU({
      ...editingSBU,
      tierAssignments: updatedTierAssignments
    });
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">SBU Management</h1>
        <Dialog open={isAddSBUOpen} onOpenChange={setIsAddSBUOpen}>
          <DialogTrigger asChild>
            <Button>Add New SBU</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New SBU</DialogTitle>
              <DialogDescription>
                Configure SBU details, SLA settings, and tier assignments
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Basic Info */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newSBU.name}
                    onChange={(e) => setNewSBU({ ...newSBU, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newSBU.description}
                    onChange={(e) => setNewSBU({ ...newSBU, description: e.target.value })}
                  />
                </div>
              </div>

              {/* SLA Configuration */}
              <div className="grid gap-4">
                <Label>SLA Configuration (minutes)</Label>
                <div className="grid grid-cols-3 gap-4">
                  {tiers.map((tier) => (
                    <div key={tier}>
                      <Label htmlFor={tier} className="text-sm">Tier {tier.slice(-1)}</Label>
                      <Input
                        id={tier}
                        type="number"
                        value={newSBU.slaConfig[tier]}
                        onChange={(e) => setNewSBU({
                          ...newSBU,
                          slaConfig: {
                            ...newSBU.slaConfig,
                            [tier]: parseInt(e.target.value)
                          }
                        })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* User Assignments */}
              <div className="grid gap-4">
                <Label>Tier Assignments</Label>
                <div className="grid grid-cols-3 gap-4">
                  {tiers.map((tier) => (
                    <div key={tier}>
                      <Label htmlFor={`${tier}-users`} className="text-sm">
                        Tier {tier.slice(-1)} Users
                      </Label>
                      <MultiSelect
                        options={users.map((user) => ({
                          id: user.id,
                          name: user.name,
                          email: user.email,
                          role: user.role
                        }))}
                        selected={selectedTierUsers[tier]}
                        onChange={(values) => handleTierAssignmentChange(tier, values)}
                        placeholder={`Select Tier ${tier.slice(-1)} users`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateSBU}>
                Add SBU
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit SBU Dialog */}
        <Dialog open={!!editingSBU} onOpenChange={(open) => !open && setEditingSBU(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit SBU</DialogTitle>
              <DialogDescription>
                Update SBU details, SLA settings, and tier assignments
              </DialogDescription>
            </DialogHeader>
            {editingSBU && (
              <div className="grid gap-6 py-4">
                {/* Basic Info */}
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={editingSBU.name}
                      onChange={(e) =>
                        setEditingSBU({ ...editingSBU, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Input
                      id="edit-description"
                      value={editingSBU.description}
                      onChange={(e) =>
                        setEditingSBU({ ...editingSBU, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-status">Status</Label>
                    <Select
                      value={editingSBU.status}
                      onValueChange={(value: 'active' | 'inactive') =>
                        setEditingSBU({ ...editingSBU, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* SLA Configuration */}
                <div className="grid gap-4">
                  <Label>SLA Configuration (minutes)</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {tiers.map((tier) => (
                      <div key={tier}>
                        <Label htmlFor={`edit-${tier}`} className="text-sm">
                          Tier {tier.slice(-1)}
                        </Label>
                        <Input
                          id={`edit-${tier}`}
                          type="number"
                          value={editingSBU.slaConfig[tier]}
                          onChange={(e) =>
                            setEditingSBU({
                              ...editingSBU,
                              slaConfig: {
                                ...editingSBU.slaConfig,
                                [tier]: parseInt(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* User Assignments */}
                <div className="grid gap-4">
                  <Label>Tier Assignments</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {tiers.map((tier) => (
                      <div key={tier}>
                        <Label htmlFor={`edit-${tier}-users`} className="text-sm">
                          Tier {tier.slice(-1)} Users
                        </Label>
                        <MultiSelect
                          options={users.map((user) => ({
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role
                          }))}
                          selected={editingSBU.tierAssignments[tier]}
                          onChange={(values) => handleEditTierAssignmentChange(tier, values)}
                          placeholder={`Select Tier ${tier.slice(-1)} users`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleUpdateSBU} disabled={loading}>
                {loading ? 'Updating...' : 'Update SBU'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Strategic Business Units</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : error ? (
              <div className="text-center text-red-500">
                Failed to load SBUs. Please try again later.
              </div>
            ) : sbus.length === 0 ? (
              <div className="text-center text-gray-500">
                No SBUs found. Create one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ticket Count</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Tier Assignments</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sbus.map((sbu) => (
                    <TableRow key={sbu.id}>
                      <TableCell>{sbu.name}</TableCell>
                      <TableCell>{sbu.description}</TableCell>
                      <TableCell>
                        <Badge variant={sbu.status === 'active' ? 'default' : 'destructive'}>
                          {sbu.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{sbu.ticketCount}</TableCell>
                      <TableCell>{new Date(sbu.lastUpdated).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {tiers.map((tier) => (
                            <div key={tier} className="flex flex-col">
                              <span className="font-medium text-sm">Tier {tier.slice(-1)}:</span>
                              <div className="flex flex-wrap gap-1">
                                {sbu.tierAssignments[tier].map((userId) => {
                                  const user = sbu.users[userId]
                                  return user ? (
                                    <Badge key={userId} variant="secondary" className="text-xs">
                                      {user.full_name}
                                    </Badge>
                                  ) : null
                                })}
                                {sbu.tierAssignments[tier].length === 0 && (
                                  <span className="text-xs text-muted-foreground">No users assigned</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingSBU(sbu)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSBU(sbu.id)}
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
      </div>
    </div>
  )
}