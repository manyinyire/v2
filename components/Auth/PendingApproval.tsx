'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/ui/icons'
import Link from 'next/link'

export function PendingApproval() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Account Pending Approval</CardTitle>
        <CardDescription>
          Your account is currently pending approval from your SBU management team.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center justify-center space-y-4 py-6">
          <div className="rounded-full bg-yellow-100 p-3">
            <Icons.clock className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="text-center">
            <h3 className="font-medium">What happens next?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              1. Your SBU management team will review your account request
            </p>
            <p className="text-sm text-muted-foreground">
              2. You'll receive an email once your account is approved
            </p>
            <p className="text-sm text-muted-foreground">
              3. You can then sign in and access the system
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Link href="/auth/signin" className="w-full">
          <Button
            variant="outline"
            className="w-full"
          >
            Back to sign in
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
