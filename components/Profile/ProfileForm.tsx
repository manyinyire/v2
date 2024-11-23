'use client'

import { useState } from 'react'
import { useProfile, UserProfile } from '@/hooks/useProfile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function ProfileForm() {
  const { profile, isLoading, updateProfile, updateAvatar } = useProfile()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsUpdating(true)

    const formData = new FormData(e.currentTarget)
    const updates: Partial<UserProfile> = {
      full_name: formData.get('full_name') as string,
      phone_number: formData.get('phone_number') as string,
      department: formData.get('department') as string,
      position: formData.get('position') as string,
    }

    const { error } = await updateProfile(updates)
    
    if (error) {
      toast.error('Failed to update profile')
    } else {
      toast.success('Profile updated successfully')
    }

    setIsUpdating(false)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const { error } = await updateAvatar(file)
    
    if (error) {
      toast.error('Failed to update avatar')
    } else {
      toast.success('Avatar updated successfully')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return <div>Failed to load profile</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Update your profile information and avatar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback>
                {profile.full_name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="avatar" className="cursor-pointer">
                <div className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md">
                  Change Avatar
                </div>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </Label>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile.full_name}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                name="phone_number"
                defaultValue={profile.phone_number || ''}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                name="department"
                defaultValue={profile.department || ''}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                name="position"
                defaultValue={profile.position || ''}
              />
            </div>

            <div className="grid gap-2">
              <Label>Strategic Business Unit (SBU)</Label>
              <Input
                value={profile.sbu}
                disabled
              />
            </div>

            <div className="grid gap-2">
              <Label>Role</Label>
              <Input
                value={profile.role}
                disabled
              />
            </div>
          </div>

          <Button type="submit" disabled={isUpdating}>
            {isUpdating && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
