'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Icons } from '@/components/ui/icons'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [sbu, setSbu] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const { signUp } = useAuth()
  const router = useRouter()

  const allowedDomains = ['fbc.co.zw', 'outrisk.co.zw']
  const sbuOptions = [
    { value: 'banking', label: 'Banking' },
    { value: 'building', label: 'Building Society' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'reinsurance', label: 'Reinsurance' },
    { value: 'securities', label: 'Securities' },
    { value: 'microplan', label: 'Microplan' },
  ]

  const validateEmail = (email: string) => {
    const domain = email.split('@')[1]
    if (!domain || !allowedDomains.includes(domain)) {
      setEmailError('Email must be from fbc.co.zw or outrisk.co.zw domain')
      return false
    }
    setEmailError('')
    return true
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (!validateEmail(email)) {
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (!sbu) {
      toast.error('Please select your SBU')
      setIsLoading(false)
      return
    }

    try {
      await signUp(email, password, fullName, sbu)
      router.push('/auth/pending-approval')
      toast.success('Sign up successful! Please wait for SBU management approval.')
    } catch (error) {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription>
          Enter your details below to create your account. You'll need management approval to access the system.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSignUp}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@fbc.co.zw"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (e.target.value) validateEmail(e.target.value)
              }}
              required
              disabled={isLoading}
              className={emailError ? 'border-red-500' : ''}
            />
            {emailError && (
              <p className="text-sm text-red-500">{emailError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sbu">Strategic Business Unit (SBU)</Label>
            <Select
              value={sbu}
              onValueChange={setSbu}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your SBU" />
              </SelectTrigger>
              <SelectContent>
                {sbuOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Create account
          </Button>
          <div className="text-sm text-center text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/auth/signin"
              className="text-primary hover:underline"
            >
              Sign in
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
